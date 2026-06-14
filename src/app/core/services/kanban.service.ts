import { Injectable, signal, computed } from '@angular/core';
import {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanChecklist,
  KanbanRef,
} from '../../shared/models/kanban.model';

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const MOCK_BOARDS: KanbanBoard[] = [
  {
    id: 'board-1',
    userId: 'vincruz',
    gameId: '1',
    gameName: 'Elden Ring',
    characterName: 'Ranni Run',
    createdAt: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
    columns: [
      {
        id: 'col-1',
        boardId: 'board-1',
        title: 'a fazer',
        color: 'todo',
        position: 0,
        cards: [
          {
            id: 'card-1',
            columnId: 'col-1',
            title: 'Derrota Godrick o Enxertado',
            tags: ['boss', 'stormveil'],
            priority: 'urgent',
            notes: '',
            checklist: [
              { id: 'ck-1', label: 'Encontrar caminho pelo castelo', done: false },
              { id: 'ck-2', label: 'Derrotar o Grafted Scion na entrada', done: false },
              { id: 'ck-3', label: 'Falar com Nepheli antes da boss fight', done: false },
            ],
            refs: [],
            position: 0,
            done: false,
          },
          {
            id: 'card-2',
            columnId: 'col-1',
            title: 'Encontrar Fragmento da Estrela',
            tags: ['item'],
            priority: 'normal',
            notes: 'Fica em Nokron, Eternal City — acessível após derrotar Radahn.',
            checklist: [],
            refs: [],
            position: 1,
            done: false,
          },
          {
            id: 'card-3',
            columnId: 'col-1',
            title: 'Falar com Fia nas Terras entre a Névoa',
            tags: ['npc'],
            priority: 'normal',
            notes: '',
            checklist: [],
            refs: [
              {
                type: 'card',
                label: 'card em outro board',
                targetId: 'card-10',
                targetName: 'Strength Build · Radahn',
              },
            ],
            position: 2,
            done: false,
          },
        ],
      },
      {
        id: 'col-2',
        boardId: 'board-1',
        title: 'em andamento',
        color: 'doing',
        position: 1,
        cards: [
          {
            id: 'card-4',
            columnId: 'col-2',
            title: 'Questline de Ranni — Fase 2',
            tags: ['quest', 'npc principal'],
            priority: 'blocking',
            notes:
              'Falar com Ranni na Torre ANTES de abrir a caixa. Depois ir até Siofra River para encontrar Blaidd. Lembrar de comprar o Colar de Lágrimas na Church of Vows.',
            checklist: [
              { id: 'ck-4', label: 'Falar com Ranni na torre', done: true },
              { id: 'ck-5', label: 'Encontrar Blaidd em Siofra River', done: true },
              { id: 'ck-6', label: 'Derrotar o Preceptor Miriel', done: false },
              { id: 'ck-7', label: 'Obter a Pedra da Lua de Gelo', done: false },
              { id: 'ck-8', label: 'Retornar à Torre de Ranni', done: false },
            ],
            refs: [
              {
                type: 'quest',
                label: 'quest vinculada',
                targetId: 'quest-ranni',
                targetName: 'Questline de Ranni, a Bruxa — v4',
              },
            ],
            position: 0,
            done: false,
          },
        ],
      },
      {
        id: 'col-3',
        boardId: 'board-1',
        title: 'concluído',
        color: 'done',
        position: 2,
        cards: [
          {
            id: 'card-5',
            columnId: 'col-3',
            title: 'Derrota Margit, o Semblante Funesto',
            tags: ['boss'],
            priority: 'normal',
            notes: '',
            checklist: [],
            refs: [],
            position: 0,
            done: true,
          },
          {
            id: 'card-6',
            columnId: 'col-3',
            title: 'Visitar a Igreja de Elleh',
            tags: [],
            priority: 'normal',
            notes: '',
            checklist: [],
            refs: [],
            position: 1,
            done: true,
          },
        ],
      },
    ],
  },
  {
    id: 'board-2',
    userId: 'vincruz',
    gameId: '1',
    gameName: 'Elden Ring',
    characterName: 'Strength Build',
    createdAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    columns: [
      {
        id: 'col-4',
        boardId: 'board-2',
        title: 'a fazer',
        color: 'todo',
        position: 0,
        cards: [
          {
            id: 'card-10',
            columnId: 'col-4',
            title: 'Starscourge Radahn — Festival',
            tags: ['boss'],
            priority: 'urgent',
            notes: '',
            checklist: [],
            refs: [],
            position: 0,
            done: false,
          },
        ],
      },
      {
        id: 'col-5',
        boardId: 'board-2',
        title: 'concluído',
        color: 'done',
        position: 1,
        cards: [],
      },
    ],
  },
  {
    id: 'board-3',
    userId: 'vincruz',
    gameId: '2',
    gameName: 'Dark Souls 3',
    characterName: 'First Playthrough',
    createdAt: new Date(Date.now() - 20 * 24 * 3600000).toISOString(),
    columns: [
      {
        id: 'col-6',
        boardId: 'board-3',
        title: 'a fazer',
        color: 'todo',
        position: 0,
        cards: [
          {
            id: 'card-7',
            columnId: 'col-6',
            title: 'Derrota Aldrich, Devorador de Deuses',
            tags: ['boss', 'irithyll'],
            priority: 'urgent',
            notes: '',
            checklist: [],
            refs: [],
            position: 0,
            done: false,
          },
        ],
      },
      {
        id: 'col-7',
        boardId: 'board-3',
        title: 'concluído',
        color: 'done',
        position: 1,
        cards: [],
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class KanbanService {
  private readonly _boards = signal<KanbanBoard[]>(structuredClone(MOCK_BOARDS));

  readonly boards = this._boards.asReadonly();

  readonly boardsByGame = computed(() => {
    const map = new Map<string, { gameId: string; gameName: string; boards: KanbanBoard[] }>();
    for (const b of this._boards()) {
      if (!map.has(b.gameId))
        map.set(b.gameId, { gameId: b.gameId, gameName: b.gameName, boards: [] });
      map.get(b.gameId)!.boards.push(b);
    }
    return [...map.values()];
  });

  getBoard(id: string): KanbanBoard | null {
    return this._boards().find((b) => b.id === id) ?? null;
  }

  createBoard(gameId: string, gameName: string, characterName: string): KanbanBoard {
    const board: KanbanBoard = {
      id: uuid(),
      userId: 'vincruz',
      gameId,
      gameName,
      characterName,
      createdAt: new Date().toISOString(),
      columns: [
        { id: uuid(), boardId: '', title: 'a fazer', color: 'todo', position: 0, cards: [] },
        { id: uuid(), boardId: '', title: 'em andamento', color: 'doing', position: 1, cards: [] },
        { id: uuid(), boardId: '', title: 'concluído', color: 'done', position: 2, cards: [] },
      ],
    };
    board.columns.forEach((c) => (c.boardId = board.id));
    this._boards.update((list) => [...list, board]);
    return board;
  }

  deleteBoard(boardId: string): void {
    this._boards.update((list) => list.filter((b) => b.id !== boardId));
  }

  addColumn(boardId: string, title: string): void {
    this._boards.update((list) =>
      list.map((b) => {
        if (b.id !== boardId) return b;
        const col: KanbanColumn = {
          id: uuid(),
          boardId,
          title,
          color: 'custom',
          position: b.columns.length,
          cards: [],
        };
        return { ...b, columns: [...b.columns, col] };
      }),
    );
  }

  deleteColumn(boardId: string, columnId: string): void {
    this._boards.update((list) =>
      list.map((b) =>
        b.id !== boardId ? b : { ...b, columns: b.columns.filter((c) => c.id !== columnId) },
      ),
    );
  }

  addCard(boardId: string, columnId: string, title: string): KanbanCard {
    const card: KanbanCard = {
      id: uuid(),
      columnId,
      title,
      tags: [],
      priority: 'normal',
      notes: '',
      checklist: [],
      refs: [],
      position: 0,
      done: false,
    };
    this._boards.update((list) =>
      list.map((b) => {
        if (b.id !== boardId) return b;
        return {
          ...b,
          columns: b.columns.map((c) => {
            if (c.id !== columnId) return c;
            card.position = c.cards.length;
            return { ...c, cards: [...c.cards, card] };
          }),
        };
      }),
    );
    return card;
  }

  updateCard(boardId: string, updated: KanbanCard): void {
    this._boards.update((list) =>
      list.map((b) => {
        if (b.id !== boardId) return b;
        return {
          ...b,
          columns: b.columns.map((c) => ({
            ...c,
            cards: c.cards.map((card) => (card.id === updated.id ? updated : card)),
          })),
        };
      }),
    );
  }

  deleteCard(boardId: string, cardId: string): void {
    this._boards.update((list) =>
      list.map((b) => {
        if (b.id !== boardId) return b;
        return {
          ...b,
          columns: b.columns.map((c) => ({
            ...c,
            cards: c.cards.filter((card) => card.id !== cardId),
          })),
        };
      }),
    );
  }

  moveCard(boardId: string, cardId: string, targetColumnId: string, targetIndex: number): void {
    this._boards.update((list) =>
      list.map((b) => {
        if (b.id !== boardId) return b;
        let movedCard: KanbanCard | null = null;
        const cols = b.columns.map((c) => {
          const idx = c.cards.findIndex((card) => card.id === cardId);
          if (idx === -1) return c;
          movedCard = { ...c.cards[idx], columnId: targetColumnId };
          return { ...c, cards: c.cards.filter((_, i) => i !== idx) };
        });
        if (!movedCard) return b;
        const card = movedCard;
        return {
          ...b,
          columns: cols.map((c) => {
            if (c.id !== targetColumnId) return c;
            const cards = [...c.cards];
            cards.splice(targetIndex, 0, card);
            return { ...c, cards: cards.map((cd, i) => ({ ...cd, position: i })) };
          }),
        };
      }),
    );
  }

  toggleChecklist(boardId: string, card: KanbanCard, checkId: string): void {
    const updated: KanbanCard = {
      ...card,
      checklist: card.checklist.map((ck) => (ck.id === checkId ? { ...ck, done: !ck.done } : ck)),
    };
    this.updateCard(boardId, updated);
  }

  addChecklist(boardId: string, card: KanbanCard, label: string): void {
    const item: KanbanChecklist = { id: uuid(), label, done: false };
    this.updateCard(boardId, { ...card, checklist: [...card.checklist, item] });
  }

  addRef(boardId: string, card: KanbanCard, ref: KanbanRef): void {
    this.updateCard(boardId, { ...card, refs: [...card.refs, ref] });
  }
}
