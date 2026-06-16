import { LowerCasePipe } from '@angular/common';
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
import { LoreCategory, LoreSummary } from '../../shared/models/lore-article.model';
import { LoreService } from '../../core/services/lore.service';

const CATEGORY_FILTERS: { id: LoreCategory | ''; label: string }[] = [
  { id: '', label: 'todos' },
  { id: 'WORLD', label: 'mundo' },
  { id: 'CHARACTER', label: 'personagem' },
];

const PAGE_SIZE = 12;

interface LoreFilters {
  q: string;
  gameId: string;
  category: LoreCategory | '';
  page: number;
}

@Component({
  selector: 'app-lore',
  imports: [RouterLink, LowerCasePipe, FormsModule],
  templateUrl: './lore.html',
  styleUrl: './lore.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lore implements OnInit {
  private readonly loreService = inject(LoreService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categoryFilters = CATEGORY_FILTERS;
  protected readonly skeletonItems = Array.from({ length: PAGE_SIZE });

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly articles = signal<LoreSummary[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly currentPage = signal(0);

  protected readonly searchTerm = signal('');
  protected readonly gameFilter = signal('');
  protected readonly categoryFilter = signal<LoreCategory | ''>('');

  private readonly load$ = new Subject<LoreFilters>();

  ngOnInit(): void {
    this.load$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(
          (a, b) =>
            a.q === b.q && a.gameId === b.gameId && a.category === b.category && a.page === b.page,
        ),
        switchMap(({ q, gameId, category, page }) => {
          this.loading.set(true);
          this.error.set(null);
          return this.loreService.list(
            page,
            PAGE_SIZE,
            q || undefined,
            gameId || undefined,
            category || undefined,
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => {
          this.articles.set(page.content);
          this.totalElements.set(page.totalElements ?? page.content.length);
          this.totalPages.set(page.totalPages ?? 1);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar o lore.');
          this.loading.set(false);
        },
      });

    this.emit(0);
  }

  private emit(page: number): void {
    this.load$.next({
      q: this.searchTerm(),
      gameId: this.gameFilter(),
      category: this.categoryFilter(),
      page,
    });
  }

  protected onSearchInput(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(0);
    this.emit(0);
  }

  protected setGameFilter(id: string): void {
    this.gameFilter.set(id);
    this.currentPage.set(0);
    this.emit(0);
  }

  protected setCategoryFilter(id: LoreCategory | ''): void {
    this.categoryFilter.set(id);
    this.currentPage.set(0);
    this.emit(0);
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

  protected categoryLabel(cat: LoreCategory): string {
    const map: Record<LoreCategory, string> = { WORLD: 'mundo', CHARACTER: 'personagem' };
    return map[cat];
  }

  protected statusLabel(s: string): string {
    const map: Record<string, string> = {
      TEORIA: 'teoria',
      CONSOLIDADO: 'consolidado',
      CANONICO: 'canônico',
    };
    return map[s];
  }
}
