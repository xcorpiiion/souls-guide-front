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
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuestNodeType, QuestStatus, QuestSummary } from '../../shared/models/quest.model';

interface MiniNode {
  id: string;
  type: QuestNodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}
interface MiniEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
import { GameSummary } from '../../shared/models/game.model';
import { QuestService } from '../../core/services/quest.service';
import { GameService } from '../../core/services/game.service';
import { AuthService } from '../../core/services/auth.service';

const STATUS_FILTERS: { id: QuestStatus | ''; label: string }[] = [
  { id: '', label: 'todos' },
  { id: 'CANONICO', label: 'canônico' },
  { id: 'CONSOLIDADO', label: 'consolidado' },
  { id: 'TEORIA', label: 'teoria' },
];

const PAGE_SIZE = 10;

interface QuestFilters {
  q: string;
  gameId: string;
  status: QuestStatus | '';
  page: number;
}

@Component({
  selector: 'app-quests',
  imports: [RouterLink, LowerCasePipe, FormsModule],
  templateUrl: './quests.html',
  styleUrl: './quests.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Quests implements OnInit {
  private readonly questService = inject(QuestService);
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly skeletonItems = Array.from({ length: PAGE_SIZE });

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly quests = signal<QuestSummary[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly currentPage = signal(0);

  protected readonly searchTerm = signal('');
  protected readonly gameFilter = signal('');
  protected readonly statusFilter = signal<QuestStatus | ''>('');

  // seletor de jogo para nova quest
  protected readonly showGamePicker = signal(false);
  protected readonly gameQuery = signal('');
  protected readonly gameSearching = signal(false);
  protected readonly gameResults = signal<GameSummary[]>([]);

  private readonly load$ = new Subject<QuestFilters>();
  private readonly gameSearch$ = new Subject<string>();

  ngOnInit(): void {
    this.load$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(
          (a, b) =>
            a.q === b.q && a.gameId === b.gameId && a.status === b.status && a.page === b.page,
        ),
        switchMap(({ q, gameId, status, page }) => {
          this.loading.set(true);
          this.error.set(null);
          return this.questService.list(
            page,
            PAGE_SIZE,
            q || undefined,
            gameId || undefined,
            status || undefined,
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => {
          this.quests.set(page.content);
          this.totalElements.set(page.totalElements ?? page.content.length);
          this.totalPages.set(page.totalPages ?? 1);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar as quests.');
          this.loading.set(false);
        },
      });

    this.gameSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) {
            this.gameResults.set([]);
            this.gameSearching.set(false);
            return [];
          }
          this.gameSearching.set(true);
          return this.gameService.search(q);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (results) => {
          this.gameResults.set(results);
          this.gameSearching.set(false);
        },
        error: () => this.gameSearching.set(false),
      });

    this.emit(0);
  }

  private emit(page: number): void {
    this.load$.next({
      q: this.searchTerm(),
      gameId: this.gameFilter(),
      status: this.statusFilter(),
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

  protected setStatusFilter(id: QuestStatus | ''): void {
    this.statusFilter.set(id);
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

  protected statusLabel(s: QuestStatus): string {
    const map: Record<QuestStatus, string> = {
      TEORIA: 'teoria',
      CONSOLIDADO: 'consolidado',
      CANONICO: 'canônico',
    };
    return map[s];
  }

  protected followersLabel(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }

  protected toggleGamePicker(): void {
    this.showGamePicker.update((v) => !v);
    if (!this.showGamePicker()) {
      this.gameQuery.set('');
      this.gameResults.set([]);
    }
  }

  protected onGameInput(value: string): void {
    this.gameQuery.set(value);
    this.gameSearch$.next(value);
  }

  protected selectGame(game: GameSummary): void {
    this.showGamePicker.set(false);
    this.gameQuery.set('');
    this.gameResults.set([]);
    this.router.navigate(['/games', game.id, 'quests', 'new']);
  }

  protected miniGraph(): { nodes: MiniNode[]; edges: MiniEdge[] } {
    return { nodes: [], edges: [] };
  }
}
