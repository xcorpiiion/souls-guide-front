import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, shareReplay, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PfPageLoader } from '@xcorpiiion/ui';
import { AuthService } from '@xcorpiiion/ng-core';
import { BossService } from '../../core/services/boss.service';
import { GameService } from '../../core/services/game.service';
import { SeoService } from '../../core/services/seo.service';
import { agruparChefesPorSecao, type BossSummary } from '../../shared/models/boss.model';
import type { GameGenre } from '@xcorpiiion/canonico';

/** Onde fica a preferência de spoiler. Vale para o site inteiro, não por jogo. */
const CHAVE_SPOILER = 'soulguide:chefes:spoiler';

/**
 * A lista de chefes de um jogo.
 *
 * O catálogo de itens é um dicionário; este é uma linha do tempo. Quem chega aqui não
 * procura um nome — pergunta o que vem agora. Por isso a tela é uma sequência agrupada
 * por região, e não uma grade de cards.
 *
 * A lista em ordem **é o roteiro do jogo**, e é o conteúdo mais spoiler do site. Ela nasce
 * coberta: número, nome e obrigatoriedade aparecem; região e imagem ficam atrás de um
 * toque. Não é um aviso no topo da página — é a informação nascendo coberta, linha a
 * linha, com a preferência lembrada em `localStorage`.
 */
@Component({
  selector: 'app-chefes',
  imports: [RouterLink, FormsModule, PfPageLoader],
  templateUrl: './chefes.html',
  styleUrl: './chefes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chefes implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bossService = inject(BossService);
  private readonly gameService = inject(GameService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * A **referência** do jogo na URL — `1-lies-of-p`, ou só `lies-of-p` num link antigo.
   * Serve para os links de volta, e é o que o endpoint de jogo sabe resolver.
   */
  protected readonly gameRef = this.route.snapshot.paramMap.get('id') ?? '';

  /**
   * O jogo resolvido, uma vez só.
   *
   * `/bosses?gameId=` e `/bosses/my-progress?gameId=` recebem `Long`, como o `/items`:
   * mandar a referência da URL responde 400. O id numérico só existe depois desta chamada,
   * então a lista e o progresso saem dela.
   */
  private readonly jogo$ = this.gameService.get(this.gameRef).pipe(shareReplay(1));

  protected readonly gameName = signal('');

  /** A familia do jogo decide se a tela diz 'regiao' ou 'capitulo'. Ver ADR 0020. */
  protected readonly genre = signal<GameGenre | null>(null);

  protected readonly chefes = signal<BossSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly derrotados = signal(0);
  protected readonly loading = signal(true);

  protected readonly busca = signal('');
  protected readonly apenasObrigatorios = signal(false);

  /** Revelado por linha e por região, sobrepondo a preferência salva. */
  protected readonly linhasReveladas = signal<Record<number, boolean>>({});
  protected readonly secoesReveladas = signal<Record<string, boolean>>({});
  protected readonly spoilerLiberado = signal(false);

  protected readonly logado = computed(() => this.auth.isLoggedIn());

  protected readonly secoes = computed(() => agruparChefesPorSecao(this.chefes(), this.genre()));

  protected readonly progressoPct = computed(() => {
    const total = this.total();
    return total === 0 ? 0 : Math.round((this.derrotados() / total) * 100);
  });

  protected readonly catalogoVazio = computed(() => !this.loading() && this.total() === 0);

  protected readonly buscaVazia = computed(
    () => !this.loading() && this.total() > 0 && this.chefes().length === 0,
  );

  /**
   * Só a digitação passa por aqui. O alternador e a primeira carga chamam direto: esperar
   * 300 ms por um clique é latência inventada.
   */
  private readonly digitou = new Subject<void>();

  ngOnInit(): void {
    this.spoilerLiberado.set(this.lerPreferencia());

    this.jogo$.subscribe({
      next: (game) => {
        this.gameName.set(game.name);
        this.genre.set(game.genre ?? null);
        this.seo.aplicar({
          titulo: `Chefes de ${game.name}`,
          descricao: `Todos os chefes de ${game.name} na ordem recomendada — quais são obrigatórios, onde ficam e o que cada um dropa.`,
        });
      },
    });

    this.digitou
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.carregar());

    this.carregar();
    this.carregarProgresso();
  }

  protected buscar(termo: string): void {
    this.busca.set(termo);
    this.loading.set(true);
    this.digitou.next();
  }

  protected alternarObrigatorios(): void {
    this.apenasObrigatorios.update((v) => !v);
    this.carregar();
  }

  protected secaoRevelada(nome: string): boolean {
    return this.secoesReveladas()[nome] ?? this.spoilerLiberado();
  }

  protected alternarSecao(nome: string): void {
    const atual = this.secaoRevelada(nome);
    this.secoesReveladas.update((mapa) => ({ ...mapa, [nome]: !atual }));
  }

  protected linhaRevelada(id: number): boolean {
    return this.linhasReveladas()[id] ?? this.spoilerLiberado();
  }

  protected revelarLinha(id: number): void {
    this.linhasReveladas.update((mapa) => ({ ...mapa, [id]: true }));
  }

  /**
   * Liberar o spoiler é escolha lembrada; cobrir de novo também.
   *
   * O que ela zera são as revelações pontuais — senão desligar o spoiler deixaria na tela
   * exatamente as linhas que a pessoa acabou de pedir para esconder.
   */
  protected alternarSpoilerGeral(): void {
    const novo = !this.spoilerLiberado();
    this.spoilerLiberado.set(novo);
    this.linhasReveladas.set({});
    this.secoesReveladas.set({});
    this.salvarPreferencia(novo);
  }

  protected alternarDerrotado(chefe: BossSummary): void {
    if (!this.logado()) return;

    const alvo = !chefe.viewerHasDefeated;
    // Otimista: a marca é um toque no meio da leitura, e esperar a resposta faria o
    // checkbox piscar atrasado. O erro devolve o estado anterior.
    this.aplicarDerrotado(chefe.id, alvo);

    const chamada = alvo
      ? this.bossService.marcarDerrotado(chefe.id)
      : this.bossService.desmarcarDerrotado(chefe.id);

    chamada.subscribe({
      next: (progresso) => {
        this.total.set(progresso.total);
        this.derrotados.set(progresso.defeated);
      },
      error: () => this.aplicarDerrotado(chefe.id, !alvo),
    });
  }

  private aplicarDerrotado(id: number, valor: boolean): void {
    this.chefes.update((lista) =>
      lista.map((c) => (c.id === id ? { ...c, viewerHasDefeated: valor } : c)),
    );
  }

  private carregar(): void {
    this.loading.set(true);

    this.jogo$
      .pipe(
        switchMap((game) =>
          this.bossService.list({
            gameId: String(game.id),
            mandatory: this.apenasObrigatorios(),
            q: this.busca(),
          }),
        ),
      )
      .subscribe({
        next: (chefes) => {
          this.chefes.set(chefes);
          // Sem filtro nenhum, a lista é o catálogo: serve de total enquanto o progresso
          // não responde, e é o que faz o contador aparecer para quem não está logado.
          if (!this.busca() && !this.apenasObrigatorios()) {
            this.total.set(chefes.length);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private carregarProgresso(): void {
    if (!this.logado()) return;

    this.jogo$.pipe(switchMap((game) => this.bossService.progresso(String(game.id)))).subscribe({
      next: (progresso) => {
        this.total.set(progresso.total);
        this.derrotados.set(progresso.defeated);
      },
    });
  }

  /**
   * `localStorage` não existe no servidor, e esta página é renderizada lá.
   *
   * Sem a guarda o SSR morre em toda rota que monte este componente — foi assim que o
   * `@xcorpiiion/ng-core` derrubou a renderização inteira antes do `ssr-globals.ts`.
   */
  private lerPreferencia(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(CHAVE_SPOILER) === 'revelado';
  }

  private salvarPreferencia(revelado: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CHAVE_SPOILER, revelado ? 'revelado' : 'protegido');
  }
}
