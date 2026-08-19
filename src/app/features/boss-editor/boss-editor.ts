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
import { ToastService } from '@xcorpiiion/ui';
import type { BossPhaseRequest, BossRequest } from '@xcorpiiion/canonico';
import { BossService } from '../../core/services/boss.service';
import { GameService } from '../../core/services/game.service';
import { ItemService } from '../../core/services/item.service';
import { QuestService } from '../../core/services/quest.service';
import { SeoService } from '../../core/services/seo.service';
import { GameFilterDropdown } from '../../shared/components/game-filter-dropdown/game-filter-dropdown';
import { GameSummary } from '../../shared/models/game.model';
import { paraId } from '../../shared/utils/ref';

/** Uma fase na tela. O `id` negativo é local: fase nova ainda não tem id do servidor. */
interface FaseForm {
  id: number | null;
  chave: string;
  title: string;
  description: string;
}

/** Um drop escolhido. `novo` marca o que será criado no catálogo ao salvar. */
interface DropForm {
  itemId: number | null;
  name: string;
  novo: boolean;
}

interface GuiaForm {
  questId: number;
  title: string;
}

let sequencia = 0;

/**
 * O formulário de chefe — cadastrar e editar.
 *
 * <h2>Dois modos de uso, e o segundo é o que decide o desenho</h2>
 * Um é o registro avulso: acabou de matar o chefe e quer anotar antes de esquecer,
 * no celular. O outro é o **mutirão** — sentar e cadastrar os trinta chefes de um jogo
 * de uma vez. É o mutirão que tira o catálogo do zero, e ele morre num formulário que
 * volta para a lista a cada salvamento. Daí o "salvar e cadastrar próximo", que mantém
 * jogo e região e limpa o resto.
 *
 * <h2>Quase tudo é opcional</h2>
 * Só nome e jogo são obrigatórios. Um chefe com só o nome é contribuição válida — outra
 * pessoa escreve a estratégia depois, que é como conteúdo colaborativo cresce. Por isso
 * as seções pesadas (como matar, fases, drops, guias, lore) nascem recolhidas:
 * abertas, o formulário parece um paredão e ninguém começa.
 */
@Component({
  selector: 'app-boss-editor',
  imports: [FormsModule, GameFilterDropdown],
  templateUrl: './boss-editor.html',
  styleUrl: './boss-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BossEditor implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bossService = inject(BossService);
  private readonly gameService = inject(GameService);
  private readonly itemService = inject(ItemService);
  private readonly questService = inject(QuestService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  /** Preenchido só na edição. Vazio significa cadastro novo. */
  protected readonly bossId = signal<string | null>(null);
  protected readonly editando = computed(() => this.bossId() !== null);

  protected readonly jogos = signal<GameSummary[]>([]);
  protected readonly jogoId = signal('');
  protected readonly jogoNome = computed(
    () => this.jogos().find((j) => String(j.id) === this.jogoId())?.name ?? '',
  );

  /** O dropdown da plataforma trabalha com nomes; o formulário guarda o id. */
  protected readonly nomesDeJogos = computed(() => this.jogos().map((j) => j.name));

  protected readonly nome = signal('');
  protected readonly mandatory = signal(true);
  protected readonly regiao = signal('');
  protected readonly ordem = signal<string>('');
  protected readonly ondeFica = signal('');

  protected readonly fraquezas = signal<string[]>([]);
  protected readonly fraquezaInput = signal('');
  protected readonly funciona = signal('');
  protected readonly naoFunciona = signal('');

  protected readonly fases = signal<FaseForm[]>([]);
  protected readonly drops = signal<DropForm[]>([]);
  protected readonly guias = signal<GuiaForm[]>([]);
  protected readonly lore = signal('');

  /**
   * A chave da arte já cadastrada. Nada nesta tela a define — o envio de imagem saiu
   * enquanto não há como moderar o que é enviado.
   *
   * Ela continua sendo lida e devolvida ao salvar, e isso **não** é resto: o `PUT`
   * substitui o chefe inteiro, então mandar `null` aqui apagaria a arte de quem já tem
   * uma, só porque alguém corrigiu um typo na estratégia.
   */
  protected readonly imagemKey = signal<string | null>(null);

  protected readonly comoMatarAberto = signal(false);
  protected readonly fasesAberto = signal(false);
  protected readonly dropsAberto = signal(false);
  protected readonly guiasAberto = signal(false);
  protected readonly loreAberto = signal(false);

  protected readonly dropBusca = signal('');
  protected readonly dropResultados = signal<{ id: number; name: string }[]>([]);
  protected readonly guiaBusca = signal('');
  protected readonly guiaResultados = signal<{ id: number; title: string }[]>([]);

  protected readonly salvando = signal(false);
  protected readonly erroDeRede = signal(false);
  protected readonly salvoAviso = signal<string | null>(null);

  /**
   * Nome que já existe neste jogo.
   *
   * É aviso, não bloqueio de servidor: o catálogo é colaborativo e dois chefes podem
   * legitimamente ter nomes parecidos. O que não pode é alguém recadastrar sem perceber.
   */
  protected readonly nomeDuplicado = signal(false);

  protected readonly podeSalvar = computed(
    () => this.nome().trim().length > 0 && this.jogoId() !== '' && !this.salvando(),
  );

  private readonly digitouNome = new Subject<string>();
  private readonly digitouDrop = new Subject<string>();
  private readonly digitouGuia = new Subject<string>();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const jogoDaRota = this.route.snapshot.paramMap.get('gameId');

    this.gameService.list(0, 100).subscribe({
      next: (page) => {
        this.jogos.set(page.content);
        if (!this.jogoId() && jogoDaRota) {
          // A rota traz slug ou id; o select trabalha com id.
          const alvo = page.content.find(
            (j) => String(j.id) === paraId(jogoDaRota) || j.slug === jogoDaRota,
          );
          if (alvo) this.jogoId.set(String(alvo.id));
        }
      },
    });

    if (id) {
      this.bossId.set(paraId(id));
      this.carregar(paraId(id));
    }

    this.seo.aplicar({
      titulo: id ? 'Editar chefe' : 'Cadastrar chefe',
      descricao: 'Contribua com o catálogo de chefes.',
      indexavel: false,
    });

    this.ligarBuscas();
  }

  // ─── busca com debounce ────────────────────────────────────────

  private ligarBuscas(): void {
    this.digitouNome
      .pipe(
        debounceTime(400),
        switchMap((termo) => this.bossService.list({ gameId: this.jogoId(), q: termo })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (achados) => {
          const alvo = this.nome().trim().toLowerCase();
          this.nomeDuplicado.set(
            achados.some((b) => b.name.toLowerCase() === alvo && String(b.id) !== this.bossId()),
          );
        },
      });

    this.digitouDrop
      .pipe(
        debounceTime(300),
        switchMap((termo) => this.itemService.list({ gameId: this.jogoId(), q: termo, size: 8 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) =>
          this.dropResultados.set(
            page.content
              .filter((i) => !this.drops().some((d) => d.itemId === i.id))
              .map((i) => ({ id: i.id, name: i.name })),
          ),
      });

    this.digitouGuia
      .pipe(
        debounceTime(300),
        switchMap((termo) => this.questService.list(0, 8, termo, this.jogoId())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) =>
          this.guiaResultados.set(
            page.content
              .filter((q) => !this.guias().some((g) => String(g.questId) === q.id))
              .map((q) => ({ id: Number(q.id), title: q.title })),
          ),
      });
  }

  private carregar(id: string): void {
    this.bossService.get(id).subscribe({
      next: (b) => {
        this.nome.set(b.name);
        this.jogoId.set(String(b.gameId));
        this.mandatory.set(b.mandatory);
        this.regiao.set(b.region ?? '');
        this.ordem.set(b.displayOrder ? String(b.displayOrder) : '');
        this.ondeFica.set(b.location ?? '');
        this.fraquezas.set([...b.weaknesses]);
        this.funciona.set(b.whatWorks ?? '');
        this.naoFunciona.set(b.whatFails ?? '');
        this.lore.set(b.lore ?? '');
        this.imagemKey.set(b.imageFileKey ?? null);

        this.fases.set(
          b.phases.map((f) => ({
            id: f.id,
            chave: `f${++sequencia}`,
            title: f.title,
            description: f.description ?? '',
          })),
        );
        this.drops.set(b.drops.map((d) => ({ itemId: d.itemId, name: d.name, novo: false })));
        this.guias.set(b.guides.map((g) => ({ questId: g.questId, title: g.title })));

        // Quem edita chega para mexer em algo específico: abrir o que já tem conteúdo
        // evita a caça ao campo dentro de seções fechadas.
        this.comoMatarAberto.set(b.weaknesses.length > 0 || !!b.whatWorks || !!b.whatFails);
        this.fasesAberto.set(b.phases.length > 0);
        this.dropsAberto.set(b.drops.length > 0);
        this.guiasAberto.set(b.guides.length > 0);
        this.loreAberto.set(!!b.lore);
      },
      error: () => this.toast.error('Erro', 'Não foi possível carregar este chefe.'),
    });
  }

  // ─── identidade ────────────────────────────────────────────────

  protected onNome(valor: string): void {
    this.nome.set(valor);
    this.nomeDuplicado.set(false);
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
    if (jogo) this.onJogo(String(jogo.id));
  }

  private onJogo(valor: string): void {
    this.jogoId.set(valor);
    // Drops e guias pertencem ao jogo: trocar de jogo torna a escolha anterior inválida.
    this.drops.set([]);
    this.guias.set([]);
    this.dropResultados.set([]);
    this.guiaResultados.set([]);
  }

  // ─── fraquezas ─────────────────────────────────────────────────

  protected onFraquezaEnter(evento: Event): void {
    evento.preventDefault();
    const valor = this.fraquezaInput().trim();
    if (!valor) return;
    if (!this.fraquezas().includes(valor)) {
      this.fraquezas.update((lista) => [...lista, valor]);
    }
    this.fraquezaInput.set('');
  }

  protected removerFraqueza(indice: number): void {
    this.fraquezas.update((lista) => lista.filter((_, i) => i !== indice));
  }

  // ─── fases ─────────────────────────────────────────────────────

  protected adicionarFase(): void {
    this.fases.update((lista) => [
      ...lista,
      { id: null, chave: `f${++sequencia}`, title: '', description: '' },
    ]);
  }

  protected atualizarFase(indice: number, campo: 'title' | 'description', valor: string): void {
    this.fases.update((lista) =>
      lista.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)),
    );
  }

  protected removerFase(indice: number): void {
    this.fases.update((lista) => lista.filter((_, i) => i !== indice));
  }

  protected moverFase(de: number, para: number): void {
    if (de === para) return;
    this.fases.update((lista) => {
      const copia = [...lista];
      const [movida] = copia.splice(de, 1);
      copia.splice(para, 0, movida);
      return copia;
    });
  }

  private arrastando = -1;

  protected onDragStart(indice: number): void {
    this.arrastando = indice;
  }

  protected onDragOver(evento: DragEvent): void {
    evento.preventDefault();
  }

  protected onDrop(indice: number): void {
    if (this.arrastando >= 0) this.moverFase(this.arrastando, indice);
    this.arrastando = -1;
  }

  // ─── drops ─────────────────────────────────────────────────────

  protected onDropBusca(valor: string): void {
    this.dropBusca.set(valor);
    if (valor.trim()) this.digitouDrop.next(valor.trim());
    else this.dropResultados.set([]);
  }

  protected escolherDrop(item: { id: number; name: string }): void {
    this.drops.update((lista) => [...lista, { itemId: item.id, name: item.name, novo: false }]);
    this.dropBusca.set('');
    this.dropResultados.set([]);
  }

  /**
   * O item ainda não existe no catálogo.
   *
   * Ele **não** é criado agora: fica marcado como novo e nasce no momento de salvar, com
   * o jogo já definido. Criar aqui deixaria um item órfão no catálogo toda vez que
   * alguém desistisse do formulário.
   */
  protected criarDrop(): void {
    const nome = this.dropBusca().trim();
    if (!nome) return;
    this.drops.update((lista) => [...lista, { itemId: null, name: nome, novo: true }]);
    this.dropBusca.set('');
    this.dropResultados.set([]);
  }

  protected removerDrop(indice: number): void {
    this.drops.update((lista) => lista.filter((_, i) => i !== indice));
  }

  protected readonly dropSemResultado = computed(
    () => this.dropBusca().trim().length > 0 && this.dropResultados().length === 0,
  );

  // ─── guias ─────────────────────────────────────────────────────

  protected onGuiaBusca(valor: string): void {
    this.guiaBusca.set(valor);
    if (valor.trim()) this.digitouGuia.next(valor.trim());
    else this.guiaResultados.set([]);
  }

  protected escolherGuia(guia: { id: number; title: string }): void {
    this.guias.update((lista) => [...lista, { questId: guia.id, title: guia.title }]);
    this.guiaBusca.set('');
    this.guiaResultados.set([]);
  }

  protected removerGuia(indice: number): void {
    this.guias.update((lista) => lista.filter((_, i) => i !== indice));
  }

  protected readonly guiaSemResultado = computed(
    () => this.guiaBusca().trim().length > 0 && this.guiaResultados().length === 0,
  );

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

    // Os drops novos viram itens do catálogo antes do chefe, porque o chefe guarda id.
    this.criarItensPendentes().then(
      (dropIds) => {
        const corpo = this.montarRequest(dropIds);
        const id = this.bossId();
        const chamada = id ? this.bossService.update(id, corpo) : this.bossService.create(corpo);

        chamada.subscribe({
          next: (salvo) => {
            this.salvando.set(false);
            if (continuar) {
              this.prepararProximo(salvo.name);
            } else {
              this.sairPara(salvo.id);
            }
          },
          error: () => {
            // Nada é limpo: o formulário continua preenchido para a pessoa tentar de
            // novo. Perder o texto digitado é o pior desfecho possível aqui.
            this.salvando.set(false);
            this.erroDeRede.set(true);
          },
        });
      },
      () => {
        this.salvando.set(false);
        this.erroDeRede.set(true);
      },
    );
  }

  /** Cria no catálogo os drops marcados como novos e devolve a lista final de ids. */
  private criarItensPendentes(): Promise<number[]> {
    const pendentes = this.drops().filter((d) => d.novo);
    const jaExistentes = this.drops()
      .filter((d) => !d.novo && d.itemId !== null)
      .map((d) => d.itemId as number);

    if (pendentes.length === 0) return Promise.resolve(jaExistentes);

    return Promise.all(
      pendentes.map(
        (d) =>
          new Promise<number>((resolve, reject) => {
            this.itemService
              .create({
                name: d.name,
                gameId: Number(this.jogoId()),
                type: 'OTHER',
                description: null,
                imageFileKey: null,
                location: null,
                foundAtNodeId: null,
              })
              .subscribe({ next: (item) => resolve(item.id), error: reject });
          }),
      ),
    ).then((novos) => [...jaExistentes, ...novos]);
  }

  private montarRequest(dropIds: number[]): BossRequest {
    const fases: BossPhaseRequest[] = this.fases()
      .filter((f) => f.title.trim().length > 0)
      .map((f) => ({
        id: f.id,
        title: f.title.trim(),
        description: f.description.trim() || null,
      }));

    return {
      name: this.nome().trim(),
      gameId: Number(this.jogoId()),
      mandatory: this.mandatory(),
      region: this.regiao().trim() || null,
      // Sem número, vai zero: a ordem se acerta arrastando na listagem depois, e exigir
      // o número aqui travaria o mutirão logo na primeira entrada.
      displayOrder: this.ordem().trim() ? Number(this.ordem()) : 0,
      imageFileKey: this.imagemKey(),
      location: this.ondeFica().trim() || null,
      weaknesses: this.fraquezas(),
      whatWorks: this.funciona().trim() || null,
      whatFails: this.naoFunciona().trim() || null,
      lore: this.lore().trim() || null,
      phases: fases,
      dropItemIds: dropIds,
      questGuideIds: this.guias().map((g) => g.questId),
    };
  }

  /**
   * O mutirão: mantém jogo e região, limpa o resto.
   *
   * Chefes da mesma região vêm em sequência, então repetir esses dois campos a cada
   * entrada é o atrito que faz alguém parar no terceiro chefe.
   */
  private prepararProximo(nomeSalvo: string): void {
    this.nome.set('');
    this.ordem.set('');
    this.ondeFica.set('');
    this.fraquezas.set([]);
    this.funciona.set('');
    this.naoFunciona.set('');
    this.fases.set([]);
    this.drops.set([]);
    this.guias.set([]);
    this.lore.set('');
    this.imagemKey.set(null);
    this.nomeDuplicado.set(false);

    this.salvoAviso.set(`"${nomeSalvo}" salvo — cadastre o próximo`);
    setTimeout(() => this.salvoAviso.set(null), 3500);
  }

  private sairPara(id: number): void {
    this.toast.success('Pronto', 'Chefe salvo.');
    this.router.navigate(['/chefes', id]);
  }

  protected cancelar(): void {
    const id = this.bossId();
    if (id) this.router.navigate(['/chefes', id]);
    else this.router.navigate(['/games', this.jogoId(), 'chefes']);
  }
}
