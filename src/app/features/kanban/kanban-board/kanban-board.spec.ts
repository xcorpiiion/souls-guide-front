import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { KanbanBoard } from './kanban-board';
import { KanbanService } from '../../../core/services/kanban.service';
import { KanbanBoard as KanbanBoardModel, KanbanCard } from '../../../shared/models/kanban.model';

const MOCK_CARD: KanbanCard = {
  id: 'card-1',
  columnId: 'col-1',
  title: 'Test card',
  tags: ['boss'],
  priority: 'normal',
  notes: '',
  checklist: [
    { id: 'ck-1', label: 'Step 1', done: true },
    { id: 'ck-2', label: 'Step 2', done: false },
  ],
  refs: [],
  position: 0,
  done: false,
};

const MOCK_BOARD: KanbanBoardModel = {
  id: 'board-1',
  userId: 'u1',
  gameId: '1',
  gameName: 'Elden Ring',
  characterName: 'Ranni Run',
  createdAt: new Date().toISOString(),
  columns: [
    {
      id: 'col-1',
      boardId: 'board-1',
      title: 'a fazer',
      color: 'todo',
      position: 0,
      cards: [MOCK_CARD],
    },
    { id: 'col-2', boardId: 'board-1', title: 'concluído', color: 'done', position: 1, cards: [] },
  ],
};

function makeKanbanSvc(board: KanbanBoardModel | null = MOCK_BOARD) {
  return {
    loaded: signal(true),
    loadBoards: vi.fn(() => of(board ? [board] : [])),
    getBoard: vi.fn(() => board),
    addColumn: vi.fn(() =>
      of({
        id: 'col-new',
        boardId: 'board-1',
        title: 'nova',
        color: 'custom' as const,
        position: 2,
        cards: [],
      }),
    ),
    deleteColumn: vi.fn(() => of(undefined)),
    addCard: vi.fn(() => of({ ...MOCK_CARD, id: 'new-card', title: 'Novo card' })),
    updateCard: vi.fn(() => of({ ...MOCK_CARD })),
    deleteCard: vi.fn(() => of(undefined)),
    moveCard: vi.fn(() => of(MOCK_BOARD)),
  };
}

function createFixture(
  boardId = 'board-1',
  svcOverride?: ReturnType<typeof makeKanbanSvc>,
): ComponentFixture<KanbanBoard> {
  const svc = svcOverride ?? makeKanbanSvc();
  TestBed.configureTestingModule({
    imports: [KanbanBoard],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: boardId }) } },
      },
      { provide: KanbanService, useValue: svc },
    ],
  });
  const fixture = TestBed.createComponent(KanbanBoard);
  fixture.detectChanges();
  return fixture;
}

describe('KanbanBoard', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('exibe not-found quando o board não existe', () => {
    const fixture = createFixture('nao-existe', makeKanbanSvc(null));
    const comp = fixture.componentInstance as any;
    expect(comp.notFound()).toBe(true);
    expect(comp.board()).toBeNull();
  });

  it('carrega as colunas do board', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.board()).not.toBeNull();
    expect(comp.columns().length).toBe(2);
  });

  it('columns() retorna array vazio quando board é null', () => {
    const fixture = createFixture('nao-existe', makeKanbanSvc(null));
    const comp = fixture.componentInstance as any;
    expect(comp.columns()).toHaveLength(0);
  });

  it('openCard() define selectedCard com clone do card', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.openCard(MOCK_CARD);
    expect(comp.selectedCard()).not.toBeNull();
    expect(comp.selectedCard().id).toBe(MOCK_CARD.id);
  });

  it('closeModal() limpa selectedCard', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.openCard(MOCK_CARD);
    comp.closeModal();
    expect(comp.selectedCard()).toBeNull();
  });

  it('checklistLabel() retorna null para card sem checklist', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    const card = { ...MOCK_CARD, checklist: [] };
    expect(comp.checklistLabel(card)).toBeNull();
  });

  it('checklistLabel() retorna "done/total" quando há checklist', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.checklistLabel(MOCK_CARD)).toBe('1/2');
  });

  it('colProgress() calcula progresso da coluna', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    const col = MOCK_BOARD.columns[1];
    expect(comp.colProgress(col)).toBe(0);
  });

  it('startAddCard() define a coluna em modo de adição', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.startAddCard('col-1');
    expect(comp.addingCardInColumn()).toBe('col-1');
    expect(comp.newCardTitle()).toBe('');
  });

  it('cancelAddCard() limpa o modo de adição', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.startAddCard('col-1');
    comp.cancelAddCard();
    expect(comp.addingCardInColumn()).toBeNull();
  });

  it('confirmAddCard() chama addCard() e limpa o estado', () => {
    const svc = makeKanbanSvc();
    const fixture = createFixture('board-1', svc);
    const comp = fixture.componentInstance as any;
    comp.startAddCard('col-1');
    comp.newCardTitle.set('Novo card');
    comp.confirmAddCard('col-1');
    expect(svc.addCard).toHaveBeenCalledWith('board-1', 'col-1', 'Novo card');
    expect(comp.addingCardInColumn()).toBeNull();
  });

  it('confirmAddCard() não chama addCard() se título vazio', () => {
    const svc = makeKanbanSvc();
    const fixture = createFixture('board-1', svc);
    const comp = fixture.componentInstance as any;
    comp.startAddCard('col-1');
    comp.newCardTitle.set('');
    comp.confirmAddCard('col-1');
    expect(svc.addCard).not.toHaveBeenCalled();
  });

  it('onCardSave() chama updateCard() e fecha o modal', () => {
    const svc = makeKanbanSvc();
    const fixture = createFixture('board-1', svc);
    const comp = fixture.componentInstance as any;
    comp.openCard(MOCK_CARD);
    comp.onCardSave({ ...MOCK_CARD, title: 'Atualizado' });
    expect(svc.updateCard).toHaveBeenCalledWith(
      'board-1',
      expect.objectContaining({ title: 'Atualizado' }),
    );
    expect(comp.selectedCard()).toBeNull();
  });

  it('onCardDelete() chama deleteCard() e fecha o modal', () => {
    const svc = makeKanbanSvc();
    const fixture = createFixture('board-1', svc);
    const comp = fixture.componentInstance as any;
    comp.openCard(MOCK_CARD);
    comp.onCardDelete(MOCK_CARD.id);
    expect(svc.deleteCard).toHaveBeenCalledWith('board-1', MOCK_CARD.id);
    expect(comp.selectedCard()).toBeNull();
  });

  it('openAddColumn() exibe o campo de nova coluna', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.openAddColumn();
    expect(comp.showAddColumn()).toBe(true);
    expect(comp.addingColumnTitle()).toBe('');
  });

  it('confirmAddColumn() chama addColumn() se título não vazio', () => {
    const svc = makeKanbanSvc();
    const fixture = createFixture('board-1', svc);
    const comp = fixture.componentInstance as any;
    comp.openAddColumn();
    comp.addingColumnTitle.set('revisão');
    comp.confirmAddColumn();
    expect(svc.addColumn).toHaveBeenCalledWith('board-1', 'revisão');
    expect(comp.showAddColumn()).toBe(false);
  });
});
