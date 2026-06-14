import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { KanbanService } from './kanban.service';

describe('KanbanService', () => {
  let svc: KanbanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(KanbanService);
  });

  it('deve criar o serviço', () => {
    expect(svc).toBeTruthy();
  });

  it('boards() retorna os boards mockados iniciais', () => {
    expect(svc.boards().length).toBeGreaterThan(0);
  });

  it('boardsByGame() agrupa boards por jogo', () => {
    const groups = svc.boardsByGame();
    expect(groups.length).toBeGreaterThan(0);
    const eldenRing = groups.find((g) => g.gameName === 'Elden Ring');
    expect(eldenRing).toBeTruthy();
    expect(eldenRing!.boards.length).toBeGreaterThanOrEqual(2);
  });

  it('getBoard() retorna o board pelo id', () => {
    const board = svc.getBoard('board-1');
    expect(board).not.toBeNull();
    expect(board!.characterName).toBe('Ranni Run');
  });

  it('getBoard() retorna null para id inexistente', () => {
    expect(svc.getBoard('nao-existe')).toBeNull();
  });

  describe('createBoard()', () => {
    it('cria um novo board com colunas padrão', () => {
      const before = svc.boards().length;
      const board = svc.createBoard('99', 'Bloodborne', 'Hunter Run');
      expect(svc.boards().length).toBe(before + 1);
      expect(board.characterName).toBe('Hunter Run');
      expect(board.gameName).toBe('Bloodborne');
      expect(board.columns.length).toBe(3);
    });

    it('as colunas do board criado têm boardId correto', () => {
      const board = svc.createBoard('99', 'Bloodborne', 'Hunter Run');
      for (const col of board.columns) {
        expect(col.boardId).toBe(board.id);
      }
    });
  });

  describe('deleteBoard()', () => {
    it('remove o board pelo id', () => {
      const board = svc.createBoard('99', 'Bloodborne', 'Hunter Run');
      const before = svc.boards().length;
      svc.deleteBoard(board.id);
      expect(svc.boards().length).toBe(before - 1);
      expect(svc.getBoard(board.id)).toBeNull();
    });
  });

  describe('addColumn()', () => {
    it('adiciona uma coluna ao board', () => {
      const board = svc.getBoard('board-1')!;
      const before = board.columns.length;
      svc.addColumn('board-1', 'revisão');
      const updated = svc.getBoard('board-1')!;
      expect(updated.columns.length).toBe(before + 1);
      expect(updated.columns.at(-1)!.title).toBe('revisão');
    });
  });

  describe('deleteColumn()', () => {
    it('remove uma coluna do board', () => {
      svc.addColumn('board-1', 'temp');
      const board = svc.getBoard('board-1')!;
      const col = board.columns.find((c) => c.title === 'temp')!;
      const before = board.columns.length;
      svc.deleteColumn('board-1', col.id);
      expect(svc.getBoard('board-1')!.columns.length).toBe(before - 1);
    });
  });

  describe('addCard()', () => {
    it('adiciona um card na coluna correta', () => {
      const card = svc.addCard('board-1', 'col-1', 'Novo card de teste');
      const col = svc.getBoard('board-1')!.columns.find((c) => c.id === 'col-1')!;
      expect(col.cards.some((c) => c.id === card.id)).toBe(true);
      expect(card.title).toBe('Novo card de teste');
    });

    it('card criado tem prioridade normal e listas vazias', () => {
      const card = svc.addCard('board-1', 'col-1', 'Card vazio');
      expect(card.priority).toBe('normal');
      expect(card.checklist).toHaveLength(0);
      expect(card.tags).toHaveLength(0);
    });
  });

  describe('updateCard()', () => {
    it('atualiza um card existente', () => {
      const board = svc.getBoard('board-1')!;
      const original = board.columns[0].cards[0];
      const updated = { ...original, title: 'Título atualizado', notes: 'nota nova' };
      svc.updateCard('board-1', updated);
      const col = svc.getBoard('board-1')!.columns[0];
      const found = col.cards.find((c) => c.id === original.id)!;
      expect(found.title).toBe('Título atualizado');
      expect(found.notes).toBe('nota nova');
    });
  });

  describe('deleteCard()', () => {
    it('remove um card do board', () => {
      const card = svc.addCard('board-1', 'col-1', 'Para deletar');
      svc.deleteCard('board-1', card.id);
      const col = svc.getBoard('board-1')!.columns.find((c) => c.id === 'col-1')!;
      expect(col.cards.some((c) => c.id === card.id)).toBe(false);
    });
  });

  describe('moveCard()', () => {
    it('move um card de uma coluna para outra', () => {
      const board = svc.getBoard('board-1')!;
      const sourceCard = board.columns[0].cards[0];
      const targetColId = 'col-2';
      svc.moveCard('board-1', sourceCard.id, targetColId, 0);
      const updated = svc.getBoard('board-1')!;
      const sourceCol = updated.columns.find((c) => c.id === 'col-1')!;
      const targetCol = updated.columns.find((c) => c.id === 'col-2')!;
      expect(sourceCol.cards.some((c) => c.id === sourceCard.id)).toBe(false);
      expect(targetCol.cards.some((c) => c.id === sourceCard.id)).toBe(true);
    });

    it('card movido tem o columnId atualizado', () => {
      const board = svc.getBoard('board-1')!;
      const sourceCard = board.columns[0].cards[0];
      svc.moveCard('board-1', sourceCard.id, 'col-2', 0);
      const targetCol = svc.getBoard('board-1')!.columns.find((c) => c.id === 'col-2')!;
      const moved = targetCol.cards.find((c) => c.id === sourceCard.id)!;
      expect(moved.columnId).toBe('col-2');
    });
  });

  describe('toggleChecklist()', () => {
    it('alterna o estado done do item do checklist', () => {
      const board = svc.getBoard('board-1')!;
      const card = board.columns[0].cards[0];
      const item = card.checklist[0];
      const before = item.done;
      svc.toggleChecklist('board-1', card, item.id);
      const updated = svc.getBoard('board-1')!.columns[0].cards.find((c) => c.id === card.id)!;
      expect(updated.checklist[0].done).toBe(!before);
    });
  });

  describe('addChecklist()', () => {
    it('adiciona um item ao checklist do card', () => {
      const board = svc.getBoard('board-1')!;
      const card = board.columns[0].cards[0];
      const before = card.checklist.length;
      svc.addChecklist('board-1', card, 'Novo item do checklist');
      const updated = svc.getBoard('board-1')!.columns[0].cards.find((c) => c.id === card.id)!;
      expect(updated.checklist.length).toBe(before + 1);
      expect(updated.checklist.at(-1)!.label).toBe('Novo item do checklist');
      expect(updated.checklist.at(-1)!.done).toBe(false);
    });
  });
});
