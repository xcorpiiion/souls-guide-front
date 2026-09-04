import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import {
  Game,
  GameFeature,
  gameToSummary,
  GameSummary,
  temCapacidade,
} from '../../shared/models/game.model';
import {
  Contributor,
  ContributorRole,
  ContributorSort,
} from '../../shared/models/game-contributor.model';
import { QuestSummary } from '../../shared/models/quest.model';
import { LoreSummary } from '../../shared/models/lore-article.model';
import { ENDING_KIND_LABEL, EndingSummary } from '../../shared/models/ending.model';
import { GameService } from '../../core/services/game.service';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';
import { EndingService } from '../../core/services/ending.service';
import { AuthService } from '@xcorpiiion/ng-core';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { resumo, SeoService } from '../../core/services/seo.service';
import { ConfirmService } from '@xcorpiiion/ui';
import { ToastService } from '@xcorpiiion/ui';
import { PfPageLoader } from '@xcorpiiion/ui';

type Tab = 'quests' | 'lore' | 'endings' | 'contributors';

@Component({
  selector: 'app-game-detail',
  imports: [RouterLink, PfPageLoader],
  templateUrl: './game-detail.html',
  styleUrl: './game-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private readonly questService = inject(QuestService);
  private readonly loreService = inject(LoreService);
  private readonly endingService = inject(EndingService);
  private readonly personalQuestService = inject(PersonalQuestService);
  private readonly seo = inject(SeoService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  /** A referência como veio na URL: id ou slug. É o que o endpoint do jogo resolve. */
  protected readonly referencia = this.route.snapshot.paramMap.get('id') ?? '';

  /**
   * O id numérico, que só existe depois que o jogo carrega.
   *
   * **Não dá para tirar da URL.** O jogo usa slug puro (ADR 0013), e por isso
   * `paraId('lies-of-p')` devolve o próprio texto — de propósito, para o servidor
   * resolver. Mas tudo que vem depois — quests, lore, finais, seguir, copiar — precisa
   * do id de verdade.
   *
   * Usar a referência aqui era o bug: `q.gameId === 'lies-of-p'` nunca casa, e a página
   * aberta pelo endereço legível dizia "nenhuma quest" com nove quests no banco. Só o
   * cabeçalho funcionava, porque só ele passa pelo endpoint que aceita slug.
   */
  protected readonly gameId = signal('');

  /**
   * O número de quests e de finais entra na descrição porque é o que distingue a
   * página de jogo de todas as outras na página de resultado: "Elden Ring — 34 guias"
   * diz mais do que a sinopse do jogo, que é igual em toda parte da internet.
   */
  private aplicarSeo(): void {
    const g = this.game();
    if (!g) return;

    // Fora do escopo a página é ficha mínima, e a descrição não pode prometer guia que não
    // existe nem vai existir — quem chega por essa promessa sai no primeiro segundo.
    const doEscopo = g.dentroDoEscopo !== false;

    this.seo.aplicar({
      titulo: g.name,
      descricao: doEscopo
        ? resumo(g.description) ||
          `Guias de quest, finais e lore de ${g.name}, escritos e revisados pela comunidade.`
        : resumo(g.description) || `${g.name} no catálogo do SoulGuide.`,
      imagem: g.imageUrl ?? null,
      // O jogo tem slug proprio, e o endpoint resolve os dois formatos.
      canonical: g.slug ? `/games/${g.slug}` : null,
      // Tirar o jogo do sitemap.xml não basta, e é por isso que esta linha existe: sitemap
      // é convite, não cerca — quem chega por link direto é indexado do mesmo jeito. Ver
      // ADR 0027 do souls-guide-api.
      //
      // A comparação é com `false`, e não um booleano cru: ausente significa resposta sem
      // o campo, e o padrão seguro nesse caso é **indexar**. Deixar de marcar `noindex`
      // numa ficha mínima se conserta na próxima visita do crawler; marcar `noindex` em
      // Elden Ring por engano tira do índice a página que traz gente para o site.
      indexavel: doEscopo,
    });

    this.seo.estruturado({ '@type': 'VideoGame', name: g.name, description: g.description ?? '' });
  }

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly game = signal<GameSummary | null>(null);
  protected readonly gameFollowing = signal(false);
  protected readonly togglingFollow = signal(false);
  protected readonly quests = signal<QuestSummary[]>([]);
  protected readonly questsLoading = signal(true);
  protected readonly loreArticles = signal<LoreSummary[]>([]);
  protected readonly endings = signal<EndingSummary[]>([]);
  protected readonly endingsLoading = signal(true);

  protected readonly kindLabel = ENDING_KIND_LABEL;
  /** Resumos revelados um a um — spoiler de final é o mais caro de vazar sem querer. */
  protected readonly revealedEndingIds = signal<ReadonlySet<string>>(new Set());

  // ─── Contribuidores ─────────────────────────────────────────────────────────
  // A aba mostrava "lista de contribuidores em breve" e o card do topo mostrava zero,
  // porque `gameToSummary` não tem de onde tirar a contagem — o GET /games/{id} devolve
  // o jogo, não o acervo. Agora os dois números saem do mesmo endpoint da lista.
  private static readonly CONTRIBUTORS_PAGE_SIZE = 30;

  private readonly buscaDeContribuidor$ = new Subject<string>();

  protected readonly contributors = signal<Contributor[]>([]);
  protected readonly topContributors = signal<Contributor[]>([]);
  protected readonly contributorsLoading = signal(true);
  protected readonly contributorsError = signal(false);
  /** O total do jogo, sem filtro: é o número do card do topo e o do rótulo da aba. */
  protected readonly contributorsTotal = signal(0);
  /** O total do filtro atual, que é contra quem o "mostrar mais" se compara. */
  protected readonly contributorsFiltered = signal(0);
  protected readonly contributorQuery = signal('');
  protected readonly contributorRole = signal<ContributorRole | null>(null);
  protected readonly contributorSort = signal<ContributorSort>('CONTRIBUTIONS');
  private readonly contributorPage = signal(0);

  protected readonly hasMoreContributors = computed(
    () => this.contributors().length < this.contributorsFiltered(),
  );

  protected readonly contributorFilterAtivo = computed(
    () => this.contributorQuery().trim().length > 0 || this.contributorRole() !== null,
  );

  /**
   * O pódio só aparece sem filtro. Com "editores" marcado, um top 3 geral em cima de uma
   * lista que não contém aquelas pessoas informa menos do que confunde.
   */
  protected readonly showTopContributors = computed(
    () => !this.contributorFilterAtivo() && this.topContributors().length > 0,
  );

  // ─── O que esta página mostra ───────────────────────────────────────────────
  // A página era de souls-like sem dizer que era: seis seções, todas para todo jogo.
  // Silent Hill 2 não tem grafo de quest e Resident Evil 5 não tem finais múltiplos, e
  // nesse formato metade da página deles é aba vazia — que não é só feia, ela afirma que
  // o site tem aquele conteúdo e não escreveu, quando o jogo é que não tem.
  //
  // Quem responde é o `features` do jogo, e não a contagem do que está cadastrado. Ver
  // `temCapacidade` para por que derivar do conteúdo é a armadilha, e não a simplificação.

  /** O jogo declara esta capacidade? É o único jeito de perguntar, no .ts e no template. */
  protected tem(f: GameFeature): boolean {
    return temCapacidade(this.game(), f);
  }

  /**
   * As abas deste jogo, na ordem em que aparecem.
   *
   * `contributors` não é capacidade e por isso não se pergunta: ela é sobre o site, não
   * sobre o jogo — todo jogo tem quem escreveu nele, mesmo o que não tem nada escrito.
   */
  protected readonly tabs = computed<Tab[]>(() => {
    const g = this.game();
    if (!g) return [];

    const abas: Tab[] = [];
    if (temCapacidade(g, 'QUEST_GRAPH')) abas.push('quests');
    if (temCapacidade(g, 'LORE')) abas.push('lore');
    if (temCapacidade(g, 'ENDINGS')) abas.push('endings');
    abas.push('contributors');
    return abas;
  });

  /**
   * A aba pedida no clique — que pode não existir neste jogo.
   *
   * Ela é separada da aba ativa porque o padrão não é mais fixo: `quests` como valor
   * inicial abriria Silent Hill numa aba de grafo que o jogo não tem, e vazia. A ativa é
   * derivada, então "a primeira que existe" não precisa de nenhum conserto imperativo
   * depois que o jogo carrega.
   */
  private readonly tabPedida = signal<Tab | null>(null);

  protected readonly activeTab = computed<Tab>(() => {
    const abas = this.tabs();
    const pedida = this.tabPedida();
    return pedida && abas.includes(pedida) ? pedida : (abas[0] ?? 'contributors');
  });

  protected readonly showHidden = signal(false);
  protected readonly showContribMenu = signal(false);
  protected readonly copyingAll = signal(false);

  protected readonly hiddenCount = computed(() => this.quests().filter((q) => q.hidden).length);

  protected readonly copyableQuests = computed(() =>
    this.quests().filter((q) => !q.isOwner && !q.isPersonal),
  );

  protected readonly filteredQuests = computed(() =>
    this.showHidden() ? this.quests() : this.quests().filter((q) => !q.hidden),
  );

  /**
   * O plural na mão porque a frase muda inteira, não só a letra final: "1 pessoa já
   * escreveu" contra "2 pessoas já escreveram". Jogo novo tem um contribuidor só, e é
   * justamente aí que o "pessoa(s) já escreveram" aparece para quem acabou de publicar.
   */
  protected readonly contributorsSubtitle = computed(() => {
    const total = this.contributorsTotal();
    const jogo = this.game()?.name ?? '';
    return total === 1
      ? `1 pessoa já escreveu ou revisou conteúdo de ${jogo}`
      : `${total} pessoas já escreveram ou revisaram conteúdo de ${jogo}`;
  });

  protected contribuicoesLabel(total: number): string {
    return total === 1 ? '1 contribuição' : `${total} contribuições`;
  }

  ngOnInit(): void {
    // Digitar não dispara uma requisição por tecla, e o `distinctUntilChanged` evita a
    // ida ao servidor quando o texto volta ao que já estava carregado.
    this.buscaDeContribuidor$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recarregarContribuidores());

    this.gameService.get(this.referencia).subscribe({
      next: (g: Game) => {
        this.game.set(gameToSummary(g));
        this.gameFollowing.set(g.userIsFollowing ?? false);
        this.aplicarSeo();
        this.loading.set(false);

        // O resto depende do id, e o id só existe agora. É uma ida a mais ao servidor
        // antes das listas — o preço de a URL ser legível, e o único jeito de a página
        // aberta pelo slug mostrar o mesmo que a aberta pelo id.
        this.gameId.set(String(g.id));
        this.carregarConteudo();
      },
      error: () => {
        this.error.set('Jogo não encontrado.');
        this.seo.aplicar({
          titulo: 'Jogo não encontrado',
          descricao: 'Este jogo não existe ou foi removido.',
          indexavel: false,
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Quests, lore e finais do jogo. Só roda depois que o id numérico está resolvido.
   *
   * Cada lista só é pedida se o jogo declarar a capacidade. Não é economia de requisição:
   * a lista que a página não vai mostrar chegaria vazia de qualquer jeito, e o `false` no
   * `loading` precisa acontecer mesmo sem ninguém para responder — senão a aba que não
   * existe deixa um spinner eterno atrás dela.
   */
  private carregarConteudo(): void {
    const id = this.gameId();

    if (this.tem('QUEST_GRAPH')) {
      this.questService.list(0, 50).subscribe({
        next: (page) => {
          this.quests.set(page.content.filter((q) => q.gameId === id));
          this.questsLoading.set(false);
        },
        error: () => this.questsLoading.set(false),
      });
    } else {
      this.questsLoading.set(false);
    }

    if (this.tem('LORE')) {
      this.loreService.list(0, 50).subscribe({
        next: (page) => this.loreArticles.set(page.content.filter((l) => l.gameId === id)),
      });
    }

    if (this.tem('ENDINGS')) {
      this.endingService.listByGame(id).subscribe({
        next: (list) => {
          this.endings.set(list);
          this.endingsLoading.set(false);
        },
        error: () => this.endingsLoading.set(false),
      });
    } else {
      this.endingsLoading.set(false);
    }

    // Junto das outras listas, e não ao abrir a aba: o card "contribuidores" fica no
    // cabeçalho, sempre à vista, e só saberia o número depois que alguém clicasse.
    this.carregarContribuidores(false);
  }

  protected onContributorSearch(valor: string): void {
    this.contributorQuery.set(valor);
    this.buscaDeContribuidor$.next(valor);
  }

  protected setContributorRole(role: ContributorRole | null): void {
    if (this.contributorRole() === role) return;
    this.contributorRole.set(role);
    this.recarregarContribuidores();
  }

  protected setContributorSort(valor: string): void {
    this.contributorSort.set(valor as ContributorSort);
    this.recarregarContribuidores();
  }

  protected loadMoreContributors(): void {
    if (this.contributorsLoading() || !this.hasMoreContributors()) return;
    this.contributorPage.update((p) => p + 1);
    this.carregarContribuidores(true);
  }

  private recarregarContribuidores(): void {
    this.contributorPage.set(0);
    this.carregarContribuidores(false);
  }

  private carregarContribuidores(append: boolean): void {
    const semFiltro = !this.contributorFilterAtivo();
    this.contributorsLoading.set(true);
    this.contributorsError.set(false);

    this.gameService
      .contributors(this.gameId(), {
        q: this.contributorQuery(),
        role: this.contributorRole(),
        sort: this.contributorSort(),
        page: this.contributorPage(),
        size: GameDetail.CONTRIBUTORS_PAGE_SIZE,
      })
      .subscribe({
        next: (page) => {
          this.contributors.update((atual) =>
            append ? [...atual, ...page.content] : page.content,
          );
          this.contributorsFiltered.set(page.totalElements);

          if (semFiltro) {
            this.contributorsTotal.set(page.totalElements);

            // O pódio sai da primeira página sem filtro, que já vem ordenada por
            // contribuições: pedir os três de novo ao servidor traria a mesma resposta.
            if (this.contributorPage() === 0 && this.contributorSort() === 'CONTRIBUTIONS') {
              this.topContributors.set(page.content.slice(0, 3));
            }
          }
          this.contributorsLoading.set(false);
        },
        error: () => {
          this.contributorsError.set(true);
          this.contributorsLoading.set(false);
        },
      });
  }

  protected isEndingRevealed(ending: EndingSummary): boolean {
    return !ending.isSpoiler || this.revealedEndingIds().has(ending.id);
  }

  protected revealEnding(ending: EndingSummary): void {
    this.revealedEndingIds.update((s) => new Set([...s, ending.id]));
  }

  protected endingProgressPercent(ending: EndingSummary): number {
    return ending.stepCount === 0
      ? 0
      : Math.round((ending.completedStepCount / ending.stepCount) * 100);
  }

  protected achievedEndingsCount(): number {
    return this.endings().filter((e) => e.userHasAchieved).length;
  }

  protected readonly revealedHiddenIds = signal<Set<string>>(new Set());

  protected toggleShowHidden(): void {
    this.showHidden.update((v) => !v);
  }

  protected revealHiddenReason(id: string): void {
    this.revealedHiddenIds.update((s) => new Set([...s, id]));
  }

  protected isHiddenReasonRevealed(quest: QuestSummary): boolean {
    return !quest.hiddenIsSpoiler || this.revealedHiddenIds().has(quest.id);
  }

  protected setTab(tab: Tab): void {
    this.tabPedida.set(tab);
  }

  protected toggleFollow(): void {
    if (this.togglingFollow()) return;
    this.togglingFollow.set(true);

    const call = this.gameFollowing()
      ? this.gameService.unfollowGame(this.gameId())
      : this.gameService.followGame(this.gameId());

    const delta = this.gameFollowing() ? -1 : 1;

    call.subscribe({
      next: () => {
        this.gameFollowing.update((v) => !v);
        this.game.update((g) => (g ? { ...g, followersCount: g.followersCount + delta } : g));
        this.togglingFollow.set(false);
      },
      error: () => this.togglingFollow.set(false),
    });
  }

  protected toggleContribMenu(): void {
    this.showContribMenu.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(e: MouseEvent): void {
    if (!this.showContribMenu()) return;
    const host = this.el.nativeElement as HTMLElement;
    if (!host.contains(e.target as Node)) {
      this.showContribMenu.set(false);
    }
  }

  protected copyAll(): void {
    if (!this.copyableQuests().length || this.copyingAll()) return;

    this.confirm
      .ask({
        title: 'Copiar todas as quests',
        message: `Deseja copiar ${this.copyableQuests().length} quest(s) deste jogo para o seu perfil?`,
        confirmLabel: 'copiar todas',
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => {
          this.copyingAll.set(true);
          return this.personalQuestService.copyAllFromGame(this.gameId());
        }),
      )
      .subscribe({
        next: ({ copied, skipped }) => {
          this.copyingAll.set(false);
          if (copied > 0) {
            this.toast.success(
              'Quests copiadas',
              `${copied} quest(s) copiada(s) para o seu perfil.${skipped ? ` ${skipped} já existia(m).` : ''}`,
            );
          } else {
            this.toast.info('Nada novo', 'Todas as quests já estavam no seu perfil.');
          }
        },
        error: () => {
          this.copyingAll.set(false);
          this.toast.error('Erro', 'Não foi possível copiar as quests.');
        },
      });
  }

  protected trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  protected trackByUserId(_: number, item: Contributor): string {
    return item.userId;
  }
}
