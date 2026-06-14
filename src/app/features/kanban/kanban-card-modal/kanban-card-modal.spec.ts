import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { KanbanCardModal } from './kanban-card-modal';
import { KanbanCard, KanbanColumn } from '../../../shared/models/kanban.model';

const MOCK_CARD: KanbanCard = {
  id: 'card-1',
  columnId: 'col-1',
  title: 'Derrotar Malenia',
  tags: ['boss'],
  priority: 'urgent',
  notes: 'Difícil demais.',
  checklist: [
    { id: 'ck-1', label: 'Aprender o lifesteal', done: false },
    { id: 'ck-2', label: 'Treinar o dodge timing', done: true },
  ],
  refs: [
    { type: 'quest', label: 'quest vinculada', targetId: 'q1', targetName: 'Questline de Ranni' },
  ],
  position: 0,
  done: false,
};

const MOCK_COLUMNS: KanbanColumn[] = [
  { id: 'col-1', boardId: 'board-1', title: 'a fazer', color: 'todo', position: 0, cards: [] },
  { id: 'col-2', boardId: 'board-1', title: 'concluído', color: 'done', position: 1, cards: [] },
];

function createFixture(card = MOCK_CARD): ComponentFixture<KanbanCardModal> {
  TestBed.configureTestingModule({ imports: [KanbanCardModal] });
  const fixture = TestBed.createComponent(KanbanCardModal);
  fixture.componentInstance.card = card;
  fixture.componentInstance.columns = MOCK_COLUMNS;
  fixture.detectChanges();
  return fixture;
}

describe('KanbanCardModal', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('inicializa o draft com clone do card', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.draft()).not.toBeNull();
    expect(comp.draft().title).toBe(MOCK_CARD.title);
    expect(comp.draft().tags).toEqual(MOCK_CARD.tags);
  });

  it('patch() atualiza o draft parcialmente', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.patch({ title: 'Novo título' });
    expect(comp.draft().title).toBe('Novo título');
    expect(comp.draft().tags).toEqual(MOCK_CARD.tags);
  });

  it('setPriority() atualiza a prioridade', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.setPriority('blocking');
    expect(comp.draft().priority).toBe('blocking');
  });

  describe('tags', () => {
    it('addTag() adiciona tag ao draft', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      comp.tagInput.set('magia');
      comp.addTag();
      expect(comp.draft().tags).toContain('magia');
      expect(comp.tagInput()).toBe('');
    });

    it('addTag() não duplica tags', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      comp.tagInput.set('boss');
      comp.addTag();
      expect(comp.draft().tags.filter((t: string) => t === 'boss').length).toBe(1);
    });

    it('removeTag() remove uma tag', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      comp.removeTag('boss');
      expect(comp.draft().tags).not.toContain('boss');
    });
  });

  describe('checklist', () => {
    it('checklistProgress() calcula progresso', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      const progress = comp.checklistProgress();
      expect(progress).not.toBeNull();
      expect(progress.done).toBe(1);
      expect(progress.total).toBe(2);
      expect(progress.pct).toBe(50);
    });

    it('checklistProgress() retorna null sem checklist', () => {
      const fixture = createFixture({ ...MOCK_CARD, checklist: [] });
      const comp = fixture.componentInstance as any;
      expect(comp.checklistProgress()).toBeNull();
    });

    it('toggleCheck() inverte o estado do item', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      comp.toggleCheck('ck-1');
      const item = comp.draft().checklist.find((c: any) => c.id === 'ck-1');
      expect(item.done).toBe(true);
    });

    it('addCheckItem() adiciona um item ao checklist', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      comp.newCheckItem.set('Novo passo');
      comp.addCheckItem();
      expect(comp.draft().checklist.some((c: any) => c.label === 'Novo passo')).toBe(true);
      expect(comp.newCheckItem()).toBe('');
    });

    it('removeCheckItem() remove item pelo id', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      comp.removeCheckItem('ck-1');
      expect(comp.draft().checklist.some((c: any) => c.id === 'ck-1')).toBe(false);
    });
  });

  describe('onSave()', () => {
    it('emite o draft ao salvar', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      const spy = vi.fn();
      fixture.componentInstance.save.subscribe(spy);
      comp.patch({ title: 'Salvo' });
      comp.onSave();
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Salvo' }));
    });
  });

  describe('onDelete()', () => {
    it('primeiro clique ativa confirmação, segundo emite delete', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      const spy = vi.fn();
      fixture.componentInstance.delete.subscribe(spy);
      comp.onDelete();
      expect(comp.confirmingDelete()).toBe(true);
      expect(spy).not.toHaveBeenCalled();
      comp.onDelete();
      expect(spy).toHaveBeenCalledWith(MOCK_CARD.id);
    });
  });

  describe('moveToColumn()', () => {
    it('emite evento de move com o colId alvo', () => {
      const fixture = createFixture();
      const comp = fixture.componentInstance as any;
      const spy = vi.fn();
      fixture.componentInstance.move.subscribe(spy);
      comp.moveToColumn('col-2');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ targetColumnId: 'col-2' }));
      expect(comp.showMoveMenu()).toBe(false);
    });
  });

  it('onBackdropClick() emite close ao clicar no backdrop', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);
    const fakeEvent = { target: { classList: { contains: () => true } } } as any;
    comp.onBackdropClick(fakeEvent);
    expect(spy).toHaveBeenCalled();
  });

  it('onBackdropClick() não emite close ao clicar dentro do modal', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);
    const fakeEvent = { target: { classList: { contains: () => false } } } as any;
    comp.onBackdropClick(fakeEvent);
    expect(spy).not.toHaveBeenCalled();
  });
});
