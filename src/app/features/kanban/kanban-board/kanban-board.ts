import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KanbanService } from '../../../core/services/kanban.service';
import {
  KanbanBoard as KanbanBoardModel,
  KanbanCard,
  KanbanColumn,
} from '../../../shared/models/kanban.model';
import { KanbanCardModal } from '../kanban-card-modal/kanban-card-modal';

@Component({
  selector: 'app-kanban-board',
  imports: [RouterLink, KanbanCardModal],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanBoard implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly kanbanService = inject(KanbanService);

  private readonly boardId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly board = signal<KanbanBoardModel | null>(null);
  protected readonly notFound = signal(false);

  protected readonly selectedCard = signal<KanbanCard | null>(null);
  protected readonly addingColumnTitle = signal('');
  protected readonly showAddColumn = signal(false);

  protected readonly addingCardInColumn = signal<string | null>(null);
  protected readonly newCardTitle = signal('');

  private dragCardId = '';
  private dragFromColId = '';
  protected readonly dragOverColId = signal<string | null>(null);

  protected readonly checklistProgress = computed(() => {
    const card = this.selectedCard();
    if (!card || !card.checklist.length) return null;
    const done = card.checklist.filter((c) => c.done).length;
    return {
      done,
      total: card.checklist.length,
      pct: Math.round((done / card.checklist.length) * 100),
    };
  });

  ngOnInit(): void {
    const board = this.kanbanService.getBoard(this.boardId);
    if (!board) {
      this.notFound.set(true);
      return;
    }
    this.board.set(board);
  }

  private refresh(): void {
    this.board.set(this.kanbanService.getBoard(this.boardId));
  }

  // ─── Column ────────────────────────────────────────────────────────────────
  protected openAddColumn(): void {
    this.showAddColumn.set(true);
    this.addingColumnTitle.set('');
  }

  protected confirmAddColumn(): void {
    const title = this.addingColumnTitle().trim();
    if (!title) return;
    this.kanbanService.addColumn(this.boardId, title);
    this.showAddColumn.set(false);
    this.refresh();
  }

  protected deleteColumn(col: KanbanColumn): void {
    this.kanbanService.deleteColumn(this.boardId, col.id);
    this.refresh();
  }

  // ─── Card add ──────────────────────────────────────────────────────────────
  protected startAddCard(colId: string): void {
    this.addingCardInColumn.set(colId);
    this.newCardTitle.set('');
  }

  protected confirmAddCard(colId: string): void {
    const title = this.newCardTitle().trim();
    if (!title) {
      this.addingCardInColumn.set(null);
      return;
    }
    this.kanbanService.addCard(this.boardId, colId, title);
    this.addingCardInColumn.set(null);
    this.refresh();
  }

  protected cancelAddCard(): void {
    this.addingCardInColumn.set(null);
  }

  protected onAddCardKeydown(e: KeyboardEvent, colId: string): void {
    if (e.key === 'Enter') this.confirmAddCard(colId);
    else if (e.key === 'Escape') this.cancelAddCard();
  }

  // ─── Card modal ────────────────────────────────────────────────────────────
  protected openCard(card: KanbanCard): void {
    this.selectedCard.set(structuredClone(card));
  }

  protected onCardSave(updated: KanbanCard): void {
    this.kanbanService.updateCard(this.boardId, updated);
    this.selectedCard.set(null);
    this.refresh();
  }

  protected onCardDelete(cardId: string): void {
    this.kanbanService.deleteCard(this.boardId, cardId);
    this.selectedCard.set(null);
    this.refresh();
  }

  protected onCardMove(event: { card: KanbanCard; targetColumnId: string }): void {
    const board = this.board();
    if (!board) return;
    const col = board.columns.find((c) => c.id === event.targetColumnId);
    if (!col) return;
    this.kanbanService.moveCard(
      this.boardId,
      event.card.id,
      event.targetColumnId,
      col.cards.length,
    );
    this.selectedCard.set(null);
    this.refresh();
  }

  protected closeModal(): void {
    this.selectedCard.set(null);
  }

  // ─── Drag and drop ─────────────────────────────────────────────────────────
  protected onDragStart(card: KanbanCard, colId: string): void {
    this.dragCardId = card.id;
    this.dragFromColId = colId;
  }

  protected onDragOver(e: DragEvent, colId: string): void {
    e.preventDefault();
    this.dragOverColId.set(colId);
  }

  protected onDragLeave(): void {
    this.dragOverColId.set(null);
  }

  protected onDrop(e: DragEvent, colId: string): void {
    e.preventDefault();
    this.dragOverColId.set(null);
    if (!this.dragCardId) return;
    const board = this.board();
    if (!board) return;
    const col = board.columns.find((c) => c.id === colId);
    if (!col) return;
    this.kanbanService.moveCard(this.boardId, this.dragCardId, colId, col.cards.length);
    this.dragCardId = '';
    this.dragFromColId = '';
    this.refresh();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  protected colCardsDone(col: KanbanColumn): number {
    return col.cards.filter((c) => c.done).length;
  }

  protected colProgress(col: KanbanColumn): number {
    if (!col.cards.length) return 0;
    return Math.round((this.colCardsDone(col) / col.cards.length) * 100);
  }

  protected checklistLabel(card: KanbanCard): string | null {
    if (!card.checklist.length) return null;
    const done = card.checklist.filter((c) => c.done).length;
    return `${done}/${card.checklist.length}`;
  }

  protected columns(): KanbanColumn[] {
    return this.board()?.columns ?? [];
  }
}
