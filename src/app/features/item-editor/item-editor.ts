import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@xcorpiiion/ng-core';
import { ToastService } from '@xcorpiiion/ui';
import type { ItemRequest, ItemType } from '@xcorpiiion/canonico';
import { ItemService } from '../../core/services/item.service';
import { GameService } from '../../core/services/game.service';
import { QuestService } from '../../core/services/quest.service';
import { SeoService } from '../../core/services/seo.service';
import { ehAdmin } from '../../core/guards/admin.guard';
import { GameFilterDropdown } from '../../shared/components/game-filter-dropdown/game-filter-dropdown';
import { GameSummary } from '../../shared/models/game.model';
import { ITEM_TYPE_LABEL, ITEM_TYPE_ORDER } from '../../shared/models/item.model';
import { paraId } from '../../shared/utils/ref';

/** O guia escolhido, enquanto o passo dele ainda não foi. */
interface GuiaPendente {
  questId: string;
  title: string;
}

/** O vínculo pronto: é isto que vira `foundAtNodeId` no request. */
interface Vinculo {
  questTitle: string;
  nodeId: number;
  nodeTitle: string;
}

/**
 * O formulário de item — cadastrar e editar.
 *
 * <h2>O catálogo começa em zero, e é isso que decide o desenho</h2>
 * Quem tira um catálogo do zero senta e cadastra trinta itens de uma vez. Esse mutirão
 * morre num formulário que volta para a lista a cada salvamento, daí o "salvar e
 * cadastrar próximo", que mantém o jogo e limpa o resto. O tipo **também** é limpo: itens
 * cadastrados em sequência costumam vir do mesmo lugar, não da mesma categoria.
 *
 * <h2>O vínculo com o passo do guia é o que o catálogo tem a mais</h2>
 * `foundAtNodeId` é o caminho de volta para quem explica como chegar lá — uma lista de
 * itens solta não tem isso. Escolher um nó exige saber de qual guia ele é, então o
 * seletor tem dois níveis (guia → passo) em vez de uma busca só: nome de passo se repete
 * entre guias ("a ponte quebrada"), e uma lista chapada não diria qual é qual.
 *
 * <p>Não há campo de imagem, pelo mesmo motivo do `boss-editor`: não há como moderar o
 * que é enviado. A `imageFileKey` continua sendo lida e devolvida ao salvar — o `PUT`
 * substitui o item inteiro, e mandar `null` apagaria a arte de quem já tem uma só porque
 * alguém corrigiu um typo no local.
 */
@Component({
  selector: 'app-item-editor',
  imports: [FormsModule, GameFilterDropdown],
  templateUrl: './item-editor.html',
  styleUrl: './item-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemEditor implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly itemService = inject(ItemService);
  private readonly gameService = inject(GameService);
  private readonly questService = inject(QuestService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tipos = ITEM_TYPE_ORDER;
  protected readonly tipoLabel = ITEM_TYPE_LABEL;

  /** Preenchido só na edição. Vazio significa cadastro novo. */
  protected readonly itemId = signal<string | null>(null);
  protected readonly editando = computed(() => this.itemId() !== null);

  /** Excluir é `hasRole('ADMIN')` no servidor; aqui é só não mostrar o que dá 403. */
  protected readonly admin = ehAdmin(this.auth);

  protected readonly jogos = signal<GameSummary[]>([]);
  protected readonly jogoId = signal('');
  protected readonly jogoNome = computed(
    () => this.jogos().find((j) => String(j.id) === this.jogoId())?.name ?? '',
  );

  /** O dropdown da plataforma trabalha com nomes; o formulário guarda o id. */
  protected readonly nomesDeJogos = computed(() => this.jogos().map((j) => j.name));

  protected readonly nome = signal('');
  protected readonly tipo = signal<ItemType | null>(null);
  protected readonly local = signal('');
  protected readonly descricao = signal('');
  protected readonly descricaoAberta = signal(false);

  /** Ver o javadoc da classe: é lida para ser devolvida, não é resto. */
  private readonly imagemKey = signal<string | null>(null);

  protected readonly guiaBusca = signal('');
  protected readonly guiaResultados = signal<{ id: string; title: string }[]>([]);
  protected readonly guiaPendente = signal<GuiaPendente | null>(null);
  protected readonly passos = signal<{ id: string; label: string }[]>([]);
  protected readonly vinculo = signal<Vinculo | null>(null);

  protected readonly salvando = signal(false);
  protected readonly erroDeRede = signal(false);
  protected readonly salvoAviso = signal<string | null>(null);
  protected readonly confirmandoExclusao = signal(false);

  /**
   * Nome que já existe neste jogo.
   *
   * É aviso, não bloqueio: o catálogo é colaborativo e dois itens podem legitimamente ter
   * nomes parecidos. O que não pode é alguém recadastrar sem perceber.
   */
  protected readonly nomeDuplicado = signal<string | null>(null);

  protected readonly podeSalvar = computed(
    () =>
      this.nome().trim().length > 0 &&
      this.jogoId() !== '' &&
      this.tipo() !== null &&
      !this.salvando(),
  );

  /** As três telas do seletor de guia, em ordem: vínculo pronto, passos, busca. */
  protected readonly escolhendoPasso = computed(
    () => !this.vinculo() && this.guiaPendente() !== null,
  );
  protected readonly buscandoGuia = computed(() => !this.vinculo() && !this.guiaPendente());
  protected readonly guiaSemResultado = computed(
    () => this.guiaBusca().trim().length > 0 && this.guiaResultados().length === 0,
  );

  private readonly digitouNome = new Subject<string>();
  private readonly digitouGuia = new Subject<string>();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const jogoDaRota = this.route.snapshot.paramMap.get('gameId');

    this.gameService.list({ size: 100 }).subscribe({
      next: (page) => {
        this.jogos.set(page.content);
        if (!this.jogoId() && jogoDaRota) {
          // A rota traz slug ou id; o formulário trabalha com id.
          const alvo = page.content.find(
            (j) => String(j.id) === paraId(jogoDaRota) || j.slug === jogoDaRota,
          );
          if (alvo) this.jogoId.set(String(alvo.id));
        }
      },
    });

    if (id) {
      this.itemId.set(paraId(id));
      this.carregar(paraId(id));
    }

    this.seo.aplicar({
      titulo: id ? 'Editar item' : 'Cadastrar item',
      descricao: 'Contribua com o catálogo de itens.',
      indexavel: false,
    });

    this.ligarBuscas();
  }

  // ─── busca com debounce ────────────────────────────────────────

  private ligarBuscas(): void {
    this.digitouNome
      .pipe(
        debounceTime(400),
        switchMap((termo) => this.itemService.list({ gameId: this.jogoId(), q: termo, size: 8 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => {
          const alvo = this.nome().trim().toLowerCase();
          const achado = page.content.find(
            (i) => i.name.toLowerCase() === alvo && String(i.id) !== this.itemId(),
          );
          this.nomeDuplicado.set(achado?.name ?? null);
        },
      });

    this.digitouGuia
      .pipe(
        debounceTime(300),
        switchMap((termo) => this.questService.list(0, 8, termo, this.jogoId())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) =>
          this.guiaResultados.set(page.content.map((q) => ({ id: q.id, title: q.title }))),
      });
  }

  private carregar(id: string): void {
    this.itemService.get(id).subscribe({
      next: (item) => {
        this.nome.set(item.name);
        this.jogoId.set(item.gameId ? String(item.gameId) : '');
        this.tipo.set(item.type ?? 'OTHER');
        this.local.set(item.location ?? '');
        this.descricao.set(item.description ?? '');
        this.imagemKey.set(item.imageFileKey ?? null);

        // Quem edita chega para mexer em algo específico: a seção que já tem conteúdo
        // nasce aberta, senão a pessoa caça o campo dentro de um card fechado.
        this.descricaoAberta.set(!!item.description);

        // O DTO já traz guia e passo resolvidos — o vínculo não custa consulta nenhuma.
        if (item.foundAtNodeId) {
          this.vinculo.set({
            questTitle: item.foundAtQuestTitle ?? 'guia',
            nodeId: item.foundAtNodeId,
            nodeTitle: item.foundAtNodeTitle ?? 'passo',
          });
        }
      },
      error: () => this.toast.error('Erro', 'Não foi possível carregar este item.'),
    });
  }

  // ─── identidade ────────────────────────────────────────────────

  protected onNome(valor: string): void {
    this.nome.set(valor);
    this.nomeDuplicado.set(null);
    if (valor.trim()) this.digitouNome.next(valor.trim());
  }

  /**
   * O dropdown devolve o nome; o formulário guarda o id.
   *
   * <p>Nome que não bate com nenhum jogo é ignorado em vez de virar id vazio: assim um
   * clique estranho não apaga a escolha que já estava feita.
   */
  protected onJogoPorNome(nome: string): void {
    const jogo = this.jogos().find((j) => j.name === nome);
    if (!jogo) return;

    this.jogoId.set(String(jogo.id));
    // O guia pertence ao jogo: trocar de jogo torna o vínculo anterior inválido.
    this.limparGuia();
    this.nomeDuplicado.set(null);
  }

  // ─── onde encontrar ────────────────────────────────────────────

  protected onGuiaBusca(valor: string): void {
    this.guiaBusca.set(valor);
    if (valor.trim()) this.digitouGuia.next(valor.trim());
    else this.guiaResultados.set([]);
  }

  protected escolherGuia(guia: { id: string; title: string }): void {
    this.guiaPendente.set({ questId: guia.id, title: guia.title });
    this.guiaBusca.set('');
    this.guiaResultados.set([]);
    this.passos.set([]);

    this.questService.listNodes(guia.id).subscribe({
      next: (nos) => this.passos.set(nos.map((n) => ({ id: n.id, label: n.label }))),
      error: () => this.toast.error('Erro', 'Não foi possível carregar os passos deste guia.'),
    });
  }

  protected trocarGuia(): void {
    this.guiaPendente.set(null);
    this.passos.set([]);
  }

  protected escolherPasso(passo: { id: string; label: string }): void {
    const guia = this.guiaPendente();
    if (!guia) return;

    this.vinculo.set({
      questTitle: guia.title,
      nodeId: Number(passo.id),
      nodeTitle: passo.label,
    });
    this.guiaPendente.set(null);
    this.passos.set([]);
  }

  protected desfazerVinculo(): void {
    this.limparGuia();
  }

  private limparGuia(): void {
    this.vinculo.set(null);
    this.guiaPendente.set(null);
    this.passos.set([]);
    this.guiaBusca.set('');
    this.guiaResultados.set([]);
  }

  // ─── salvar ────────────────────────────────────────────────────

  protected salvar(): void {
    this.enviar(false);
  }

  protected salvarEProximo(): void {
    this.enviar(true);
  }

  private enviar(continuar: boolean): void {
    if (!this.podeSalvar()) return;

    this.salvando.set(true);
    this.erroDeRede.set(false);

    const corpo = this.montarRequest();
    const id = this.itemId();
    const chamada = id ? this.itemService.update(id, corpo) : this.itemService.create(corpo);

    chamada.subscribe({
      next: (salvo) => {
        this.salvando.set(false);
        if (continuar) this.prepararProximo(salvo.name);
        else this.sairPara(salvo.id);
      },
      error: () => {
        // Nada é limpo: o formulário continua preenchido para a pessoa tentar de novo.
        // Perder o texto digitado é o pior desfecho possível aqui.
        this.salvando.set(false);
        this.erroDeRede.set(true);
      },
    });
  }

  private montarRequest(): ItemRequest {
    return {
      name: this.nome().trim(),
      gameId: Number(this.jogoId()),
      type: this.tipo() as ItemType,
      description: this.descricao().trim() || null,
      imageFileKey: this.imagemKey(),
      location: this.local().trim() || null,
      foundAtNodeId: this.vinculo()?.nodeId ?? null,
    };
  }

  /**
   * O mutirão: mantém o jogo, limpa o resto.
   *
   * O tipo sai junto de propósito — itens cadastrados em sequência costumam vir do mesmo
   * lugar, não da mesma categoria, e um tipo herdado sem querer é erro que ninguém revisa.
   */
  private prepararProximo(nomeSalvo: string): void {
    this.nome.set('');
    this.tipo.set(null);
    this.local.set('');
    this.descricao.set('');
    this.descricaoAberta.set(false);
    this.imagemKey.set(null);
    this.nomeDuplicado.set(null);
    this.limparGuia();

    this.salvoAviso.set(`${nomeSalvo} salvo. Próximo.`);
    setTimeout(() => this.salvoAviso.set(null), 3500);
  }

  private sairPara(id: number): void {
    this.toast.success('Pronto', 'Item salvo.');
    this.router.navigate(['/itens', id]);
  }

  // ─── excluir ───────────────────────────────────────────────────

  protected excluir(): void {
    const id = this.itemId();
    if (!id) return;

    this.itemService.delete(id).subscribe({
      next: () => {
        this.toast.success('Pronto', 'Item excluído.');
        this.router.navigate(['/games', this.jogoId(), 'itens']);
      },
      error: () => {
        this.confirmandoExclusao.set(false);
        this.toast.error('Erro', 'Não foi possível excluir este item.');
      },
    });
  }

  protected cancelar(): void {
    this.router.navigate(['/games', this.jogoId(), 'itens']);
  }
}
