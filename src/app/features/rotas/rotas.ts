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
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GameService } from '../../core/services/game.service';
import { GameSummary } from '../../shared/models/game.model';
import { AuthService } from '../../core/services/auth.service';
import { PageLoader } from '../../shared/components/page-loader/page-loader';

type SortOption = '' | 'quests' | 'contributors';

const SORT_FILTERS: { id: SortOption; label: string }[] = [
  { id: '', label: 'todos' },
  { id: 'quests', label: 'mais quests' },
  { id: 'contributors', label: 'mais contribuidores' },
];

const PAGE_SIZE = 18;

@Component({
  selector: 'app-rotas',
  imports: [RouterLink, FormsModule, PageLoader],
  templateUrl: './rotas.html',
  styleUrl: './rotas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Rotas implements OnInit {
  private readonly gameService = inject(GameService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  protected readonly sortFilters = SORT_FILTERS;
  protected readonly skeletonItems = Array.from({ length: PAGE_SIZE });

  protected readonly loading = signal(true);
  protected readonly games = signal<GameSummary[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly currentPage = signal(0);
  protected readonly searchTerm = signal('');
  protected readonly sortFilter = signal<SortOption>('');

  private readonly load$ = new Subject<{ q: string; page: number }>();

  protected readonly displayGames = computed(() => {
    const sort = this.sortFilter();
    const list = [...this.games()];
    if (sort === 'quests') return list.sort((a, b) => b.questCount - a.questCount);
    if (sort === 'contributors')
      return list.sort((a, b) => b.contributorsCount - a.contributorsCount);
    return list;
  });

  ngOnInit(): void {
    this.load$
      .pipe(
        debounceTime(250),
        distinctUntilChanged((a, b) => a.q === b.q && a.page === b.page),
        switchMap(({ q, page }) => {
          this.loading.set(true);
          return this.gameService.list(page, PAGE_SIZE, q || undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => {
          this.games.set(page.content);
          this.totalElements.set(page.totalElements ?? page.content.length);
          this.totalPages.set(page.totalPages ?? 1);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    this.emit(0);
  }

  private emit(page: number): void {
    this.load$.next({ q: this.searchTerm(), page });
  }

  protected onSearchInput(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(0);
    this.emit(0);
  }

  protected setSortFilter(sort: SortOption): void {
    this.sortFilter.set(sort);
  }

  protected goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.emit(page);
  }

  protected pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages: number[] = [0];
    if (current > 2) pages.push(-1);
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++)
      pages.push(i);
    if (current < total - 3) pages.push(-1);
    pages.push(total - 1);
    return pages;
  }
}
