import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { KanbanService } from './kanban.service';
import { KanbanBoard, KanbanCard, KanbanColumn } from '../../shared/models/kanban.model';

const BASE = 'http://localhost:8765/souls-guide-api/kanban';

const MOCK_CARD: KanbanCard = {
  id: 'card-1',
  columnId: 'col-1',
  title: 'Derrotar Margit',
  tags: ['boss'],
  priority: 'urgent',
  notes: '',
  checklist: [],
  refs: [],
  position: 0,
  done: false,
};

const MOCK_COL: KanbanColumn = {
  id: 'col-1',
  boardId: 'board-1',
  title: 'a fazer',
  color: 'todo',
  position: 0,
  cards: [MOCK_CARD],
};

const MOCK_BOARD: KanbanBoard = {
  id: 'board-1',
  userId: 'u1',
  gameId: '1',
  gameName: 'Elden Ring',
  characterName: 'Ranni Run',
  createdAt: new Date().toISOString(),
  columns: [MOCK_COL],
};

describe('KanbanService', () => {
  let svc: KanbanService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(KanbanService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('deve criar o serviço', () => {
    expect(svc).toBeTruthy();
  });

  it('boards() começa vazio, loaded() começa false', () => {
    expect(svc.boards()).toHaveLength(0);
    expect(svc.loaded()).toBe(false);
  });

  it('getBoard() retorna null quando nenhum board carregado', () => {
    expect(svc.getBoard('board-1')).toBeNull();
  });

  describe('loadBoards()', () => {
    it('popula o signal boards e seta loaded=true', () => {
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);
      expect(svc.boards()).toHaveLength(1);
      expect(svc.boards()[0].id).toBe('board-1');
      expect(svc.loaded()).toBe(true);
    });

    it('getBoard() retorna o board após carregamento', () => {
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);
      expect(svc.getBoard('board-1')).not.toBeNull();
      expect(svc.getBoard('nao-existe')).toBeNull();
    });

    it('boardsByGame() agrupa por jogo', () => {
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);
      const groups = svc.boardsByGame();
      expect(groups.length).toBe(1);
      expect(groups[0].gameName).toBe('Elden Ring');
      expect(groups[0].boards).toHaveLength(1);
    });
  });

  describe('createBoard()', () => {
    it('faz POST e adiciona o board ao signal', () => {
      const newBoard = { ...MOCK_BOARD, id: 'board-new', characterName: 'Hunter Run' };
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);

      svc.createBoard('1', 'Elden Ring', 'Hunter Run').subscribe();
      http.expectOne((r) => r.method === 'POST' && r.url === `${BASE}/boards`).flush(newBoard);

      expect(svc.boards()).toHaveLength(2);
      expect(svc.boards()[1].characterName).toBe('Hunter Run');
    });
  });

  describe('deleteBoard()', () => {
    it('faz DELETE e remove o board do signal', () => {
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);

      svc.deleteBoard('board-1').subscribe();
      http
        .expectOne(`${BASE}/boards/board-1`)
        .flush(null, { status: 204, statusText: 'No Content' });

      expect(svc.boards()).toHaveLength(0);
    });
  });

  describe('addColumn()', () => {
    it('faz POST e adiciona coluna ao board no signal', () => {
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);

      const newCol: KanbanColumn = {
        id: 'col-2',
        boardId: 'board-1',
        title: 'em andamento',
        color: 'doing',
        position: 1,
        cards: [],
      };
      svc.addColumn('board-1', 'em andamento').subscribe();
      http.expectOne(`${BASE}/boards/board-1/columns`).flush(newCol);

      const board = svc.getBoard('board-1')!;
      expect(board.columns).toHaveLength(2);
      expect(board.columns[1].title).toBe('em andamento');
    });
  });

  describe('deleteColumn()', () => {
    it('faz DELETE e remove a coluna do signal', () => {
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);

      svc.deleteColumn('board-1', 'col-1').subscribe();
      http
        .expectOne(`${BASE}/boards/board-1/columns/col-1`)
        .flush(null, { status: 204, statusText: 'No Content' });

      expect(svc.getBoard('board-1')!.columns).toHaveLength(0);
    });
  });

  describe('addCard()', () => {
    it('faz POST e adiciona card à coluna no signal', () => {
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);

      const newCard: KanbanCard = { ...MOCK_CARD, id: 'card-new', title: 'Novo card' };
      svc.addCard('board-1', 'col-1', 'Novo card').subscribe();
      http.expectOne(`${BASE}/boards/board-1/columns/col-1/cards`).flush(newCard);

      const col = svc.getBoard('board-1')!.columns[0];
      expect(col.cards).toHaveLength(2);
      expect(col.cards[1].title).toBe('Novo card');
    });
  });

  describe('updateCard()', () => {
    it('faz PUT e atualiza o card no signal', () => {
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);

      const updated = { ...MOCK_CARD, title: 'Título atualizado', notes: 'nota nova' };
      svc.updateCard('board-1', updated).subscribe();
      http.expectOne(`${BASE}/boards/board-1/cards/card-1`).flush(updated);

      const card = svc.getBoard('board-1')!.columns[0].cards[0];
      expect(card.title).toBe('Título atualizado');
      expect(card.notes).toBe('nota nova');
    });
  });

  describe('deleteCard()', () => {
    it('faz DELETE e remove o card do signal', () => {
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([MOCK_BOARD]);

      svc.deleteCard('board-1', 'card-1').subscribe();
      http
        .expectOne(`${BASE}/boards/board-1/cards/card-1`)
        .flush(null, { status: 204, statusText: 'No Content' });

      expect(svc.getBoard('board-1')!.columns[0].cards).toHaveLength(0);
    });
  });

  describe('moveCard()', () => {
    it('faz POST /move e substitui o board no signal pela resposta', () => {
      const col2: KanbanColumn = {
        id: 'col-2',
        boardId: 'board-1',
        title: 'concluído',
        color: 'done',
        position: 1,
        cards: [],
      };
      const boardWith2Cols = { ...MOCK_BOARD, columns: [MOCK_COL, col2] };
      svc.loadBoards().subscribe();
      http.expectOne(`${BASE}/boards`).flush([boardWith2Cols]);

      const boardAfterMove: KanbanBoard = {
        ...boardWith2Cols,
        columns: [
          { ...MOCK_COL, cards: [] },
          { ...col2, cards: [{ ...MOCK_CARD, columnId: 'col-2' }] },
        ],
      };
      svc.moveCard('board-1', 'card-1', 'col-2', 0).subscribe();
      http.expectOne(`${BASE}/boards/board-1/cards/card-1/move`).flush(boardAfterMove);

      const updated = svc.getBoard('board-1')!;
      expect(updated.columns[0].cards).toHaveLength(0);
      expect(updated.columns[1].cards).toHaveLength(1);
      expect(updated.columns[1].cards[0].columnId).toBe('col-2');
    });
  });
});
