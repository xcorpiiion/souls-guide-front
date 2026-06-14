import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KanbanCard, KanbanColumn, CardPriority } from '../../../shared/models/kanban.model';

@Component({
  selector: 'app-kanban-card-modal',
  imports: [FormsModule],
  templateUrl: './kanban-card-modal.html',
  styleUrl: './kanban-card-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanCardModal implements OnInit {
  @Input({ required: true }) card!: KanbanCard;
  @Input({ required: true }) columns!: KanbanColumn[];

  @Output() save = new EventEmitter<KanbanCard>();
  @Output() delete = new EventEmitter<string>();
  @Output() move = new EventEmitter<{ card: KanbanCard; targetColumnId: string }>();
  @Output() dismiss = new EventEmitter<void>();

  protected readonly draft = signal<KanbanCard | null>(null);
  protected readonly tagInput = signal('');
  protected readonly newCheckItem = signal('');
  protected readonly showMoveMenu = signal(false);
  protected readonly confirmingDelete = signal(false);

  protected readonly checklistProgress = computed(() => {
    const d = this.draft();
    if (!d || !d.checklist.length) return null;
    const done = d.checklist.filter((c) => c.done).length;
    return { done, total: d.checklist.length, pct: Math.round((done / d.checklist.length) * 100) };
  });

  readonly priorities: { id: CardPriority; label: string }[] = [
    { id: 'normal', label: 'normal' },
    { id: 'urgent', label: 'urgente' },
    { id: 'blocking', label: 'bloqueante' },
  ];

  ngOnInit(): void {
    this.draft.set(structuredClone(this.card));
  }

  protected patch(partial: Partial<KanbanCard>): void {
    this.draft.update((d) => (d ? { ...d, ...partial } : d));
  }

  protected setPriority(p: CardPriority): void {
    this.patch({ priority: p });
  }

  protected addTag(): void {
    const val = this.tagInput().trim().toLowerCase();
    const d = this.draft();
    if (!val || !d || d.tags.includes(val) || d.tags.length >= 6) return;
    this.patch({ tags: [...d.tags, val] });
    this.tagInput.set('');
  }

  protected removeTag(tag: string): void {
    const d = this.draft();
    if (!d) return;
    this.patch({ tags: d.tags.filter((t) => t !== tag) });
  }

  protected onTagKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      this.addTag();
    }
  }

  protected toggleCheck(id: string): void {
    const d = this.draft();
    if (!d) return;
    this.patch({
      checklist: d.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    });
  }

  protected addCheckItem(): void {
    const label = this.newCheckItem().trim();
    const d = this.draft();
    if (!label || !d) return;
    const item = { id: Math.random().toString(36).slice(2), label, done: false };
    this.patch({ checklist: [...d.checklist, item] });
    this.newCheckItem.set('');
  }

  protected removeCheckItem(id: string): void {
    const d = this.draft();
    if (!d) return;
    this.patch({ checklist: d.checklist.filter((c) => c.id !== id) });
  }

  protected onCheckKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addCheckItem();
    }
  }

  protected moveToColumn(colId: string): void {
    const d = this.draft();
    if (!d) return;
    this.move.emit({ card: d, targetColumnId: colId });
    this.showMoveMenu.set(false);
  }

  protected onSave(): void {
    const d = this.draft();
    if (!d) return;
    this.save.emit(d);
  }

  protected onDelete(): void {
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.delete.emit(this.card.id);
  }

  protected onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('kcm__backdrop')) {
      this.dismiss.emit();
    }
  }
}
