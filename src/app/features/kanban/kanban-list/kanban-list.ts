import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KanbanService } from '../../../core/services/kanban.service';
import { GameService } from '../../../core/services/game.service';
import { GameSummary } from '../../../shared/models/game.model';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-kanban-list',
  imports: [RouterLink],
  templateUrl: './kanban-list.html',
  styleUrl: './kanban-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanList {
  protected readonly kanbanService = inject(KanbanService);
  private readonly gameService = inject(GameService);

  protected readonly boardsByGame = this.kanbanService.boardsByGame;

  protected readonly showNewForm = signal(false);
  protected readonly newCharName = signal('');
  protected readonly selectedGame = signal<GameSummary | null>(null);
  protected readonly gameQuery = signal('');
  protected readonly gameSearching = signal(false);
  protected readonly gameResults = signal<GameSummary[]>([]);
  protected readonly showGameDrop = signal(false);

  private readonly gameSearch$ = new Subject<string>();

  constructor() {
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
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (results) => {
          this.gameResults.set(results);
          this.gameSearching.set(false);
          this.showGameDrop.set(results.length > 0);
        },
        error: () => this.gameSearching.set(false),
      });
  }

  protected openNewForm(): void {
    this.showNewForm.set(true);
    this.newCharName.set('');
    this.selectedGame.set(null);
    this.gameQuery.set('');
    this.gameResults.set([]);
  }

  protected cancelNew(): void {
    this.showNewForm.set(false);
  }

  protected onGameInput(value: string): void {
    this.gameQuery.set(value);
    if (!value.trim()) {
      this.selectedGame.set(null);
      this.showGameDrop.set(false);
    }
    this.gameSearch$.next(value);
  }

  protected selectGame(game: GameSummary): void {
    this.selectedGame.set(game);
    this.gameQuery.set(game.name);
    this.showGameDrop.set(false);
    this.gameResults.set([]);
  }

  protected createBoard(): void {
    const game = this.selectedGame();
    const char = this.newCharName().trim();
    if (!game || !char) return;
    const board = this.kanbanService.createBoard(game.id, game.name, char);
    this.showNewForm.set(false);
    window.location.href = `/kanban/${board.id}`;
  }

  protected deleteBoard(id: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.kanbanService.deleteBoard(id);
  }

  protected cardCount(boardId: string): number {
    const board = this.kanbanService.getBoard(boardId);
    if (!board) return 0;
    return board.columns.reduce((sum, c) => sum + c.cards.length, 0);
  }

  protected doneCount(boardId: string): number {
    const board = this.kanbanService.getBoard(boardId);
    if (!board) return 0;
    return board.columns.reduce((sum, c) => sum + c.cards.filter((cd) => cd.done).length, 0);
  }

  protected progressPercent(boardId: string): number {
    const total = this.cardCount(boardId);
    if (!total) return 0;
    return Math.round((this.doneCount(boardId) / total) * 100);
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
