import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GameSummary } from '../../shared/models/game.model';
import { GameService } from '../../core/services/game.service';
import { PageLoader } from '../../shared/components/page-loader/page-loader';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-games',
  imports: [RouterLink, FormsModule, PageLoader],
  templateUrl: './games.html',
  styleUrl: './games.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Games implements OnInit {
  private readonly gameService = inject(GameService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly games = signal<GameSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  private readonly search$ = new Subject<{ term: string; page: number }>();

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.term === b.term && a.page === b.page),
        switchMap(({ term, page }) => {
          this.loading.set(true);
          this.error.set(null);
          return this.gameService.list(page, PAGE_SIZE, term || undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pageResult) => {
          this.games.set(pageResult.content);
          this.totalPages.set(pageResult.totalPages ?? 1);
          this.totalElements.set(pageResult.totalElements ?? pageResult.content.length);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar os jogos.');
          this.loading.set(false);
        },
      });

    this.search$.next({ term: '', page: 0 });
  }

  protected onSearchInput(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(0);
    this.search$.next({ term, page: 0 });
  }

  protected goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.search$.next({ term: this.searchTerm(), page });
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

  protected trackById(_: number, game: GameSummary): string {
    return game.id;
  }
}
