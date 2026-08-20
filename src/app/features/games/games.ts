import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounce, switchMap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  GAME_GENRE_CLASS,
  GAME_GENRE_FILTERS,
  GAME_GENRE_LABEL,
  GameGenre,
  GameSummary,
  seguidoresLabel,
} from '../../shared/models/game.model';
import { GameSeries } from '../../shared/models/game-series.model';
import { GameService } from '../../core/services/game.service';
import { GameSeriesService } from '../../core/services/game-series.service';
import { PfPageLoader } from '@xcorpiiion/ui';

const PAGE_SIZE = 12;

/** Uma busca pendente. `digitando` é o que decide se ela espera o debounce. */
interface Busca {
  page: number;
  /** Acrescenta ao que já está na tela, em vez de trocar — é o "mostrar mais". */
  append: boolean;
  digitando: boolean;
}

@Component({
  selector: 'app-games',
  imports: [RouterLink, FormsModule, PfPageLoader],
  templateUrl: './games.html',
  styleUrl: './games.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Games implements OnInit {
  private readonly gameService = inject(GameService);
  private readonly seriesService = inject(GameSeriesService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly games = signal<GameSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly totalElements = signal(0);

  protected readonly series = signal<GameSeries[]>([]);
  protected readonly genre = signal<GameGenre | null>(null);
  protected readonly seriesId = signal<number | null>(null);

  protected readonly genreFilters = GAME_GENRE_FILTERS;
  protected readonly genreLabel = GAME_GENRE_LABEL;
  protected readonly genreClass = GAME_GENRE_CLASS;

  /** Ainda há página adiante: o que está na tela é menos do que o total do filtro. */
  protected readonly hasMore = computed(() => this.games().length < this.totalElements());

  private readonly busca$ = new Subject<Busca>();
  private pagina = 0;

  ngOnInit(): void {
    this.busca$
      .pipe(
        // Só digitar espera. Clicar num chip ou em "mostrar mais" dispara na hora — 300ms
        // num clique é lentidão perceptível, e não há tecla seguinte para agrupar.
        debounce((b) => timer(b.digitando ? 300 : 0)),
        switchMap((b) => {
          this.error.set(null);
          if (b.append) this.loadingMore.set(true);
          else this.loading.set(true);

          return this.gameService.list({
            page: b.page,
            size: PAGE_SIZE,
            name: this.searchTerm() || undefined,
            genre: this.genre(),
            seriesId: this.seriesId(),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pageResult) => {
          this.games.update((atuais) =>
            this.pagina === 0 ? pageResult.content : [...atuais, ...pageResult.content],
          );
          this.totalElements.set(pageResult.totalElements ?? pageResult.content.length);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar os jogos.');
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });

    this.carregarSeries();
    this.buscar({ digitando: false });
  }

  /**
   * As séries que viram chip.
   *
   * Falhar aqui não mostra erro: a lista de jogos é o conteúdo da página, e o filtro de
   * série é um atalho para ela. Sem as séries a tela continua inteira, com um chip a menos.
   */
  private carregarSeries(): void {
    this.seriesService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => this.series.set(lista),
        error: () => this.series.set([]),
      });
  }

  protected onSearchInput(term: string): void {
    this.searchTerm.set(term);
    this.buscar({ digitando: true });
  }

  /** Clicar no chip que já está ativo desliga o filtro — é como um chip se desmarca. */
  protected onGenre(g: GameGenre | null): void {
    this.genre.set(g === null || this.genre() === g ? null : g);
    this.buscar({ digitando: false });
  }

  protected onSeries(id: number | null): void {
    this.seriesId.set(id === null || this.seriesId() === id ? null : id);
    this.buscar({ digitando: false });
  }

  /**
   * Clicar na série dentro do card filtra a lista por ela.
   *
   * O card carrega o nome e o slug da série, não o id — quem tem o id é a lista de chips.
   * Série que não esteja entre os chips (o carregamento delas falhou) não faz nada, em
   * vez de limpar o filtro e parecer que o clique deu errado.
   */
  protected onSeriesByName(game: GameSummary): void {
    const encontrada = this.series().find((s) => s.slug === game.seriesSlug);
    if (encontrada) this.onSeries(encontrada.id);
  }

  protected onLoadMore(): void {
    this.pagina += 1;
    this.busca$.next({ page: this.pagina, append: true, digitando: false });
  }

  /** Filtro novo sempre volta para a primeira página — senão a tela abriria no meio. */
  private buscar(opcoes: { digitando: boolean }): void {
    this.pagina = 0;
    this.busca$.next({ page: 0, append: false, digitando: opcoes.digitando });
  }

  protected seguidores(total: number): string {
    return seguidoresLabel(total);
  }

  protected trackById(_: number, game: GameSummary): string {
    return game.id;
  }
}
