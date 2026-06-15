import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { KanbanBoard, KanbanCard, KanbanColumn } from '../../shared/models/kanban.model';

const BASE = `${environment.apis.soulsGuide}/kanban`;

@Injectable({ providedIn: 'root' })
export class KanbanService {
  private readonly http = inject(HttpClient);
  private readonly _boards = signal<KanbanBoard[]>([]);
  private readonly _loaded = signal(false);

  readonly boards = this._boards.asReadonly();
  readonly loaded = this._loaded.asReadonly();

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

  loadBoards(): Observable<KanbanBoard[]> {
    return this.http.get<KanbanBoard[]>(`${BASE}/boards`).pipe(
      tap((boards) => {
        this._boards.set(boards);
        this._loaded.set(true);
      }),
    );
  }

  createBoard(gameId: string, gameName: string, characterName: string): Observable<KanbanBoard> {
    return this.http
      .post<KanbanBoard>(`${BASE}/boards`, { gameId, gameName, characterName })
      .pipe(tap((board) => this._boards.update((list) => [...list, board])));
  }

  deleteBoard(boardId: string): Observable<void> {
    return this.http
      .delete<void>(`${BASE}/boards/${boardId}`)
      .pipe(tap(() => this._boards.update((list) => list.filter((b) => b.id !== boardId))));
  }

  addColumn(boardId: string, title: string): Observable<KanbanColumn> {
    return this.http
      .post<KanbanColumn>(`${BASE}/boards/${boardId}/columns`, { title })
      .pipe(
        tap((col) =>
          this._boards.update((list) =>
            list.map((b) =>
              b.id !== boardId
                ? b
                : { ...b, columns: [...b.columns, { ...col, cards: col.cards ?? [] }] },
            ),
          ),
        ),
      );
  }

  deleteColumn(boardId: string, columnId: string): Observable<void> {
    return this.http
      .delete<void>(`${BASE}/boards/${boardId}/columns/${columnId}`)
      .pipe(
        tap(() =>
          this._boards.update((list) =>
            list.map((b) =>
              b.id !== boardId ? b : { ...b, columns: b.columns.filter((c) => c.id !== columnId) },
            ),
          ),
        ),
      );
  }

  addCard(boardId: string, columnId: string, title: string): Observable<KanbanCard> {
    return this.http
      .post<KanbanCard>(`${BASE}/boards/${boardId}/columns/${columnId}/cards`, { title })
      .pipe(
        tap((card) =>
          this._boards.update((list) =>
            list.map((b) => {
              if (b.id !== boardId) return b;
              return {
                ...b,
                columns: b.columns.map((c) =>
                  c.id !== columnId ? c : { ...c, cards: [...c.cards, card] },
                ),
              };
            }),
          ),
        ),
      );
  }

  updateCard(boardId: string, updated: KanbanCard): Observable<KanbanCard> {
    return this.http.put<KanbanCard>(`${BASE}/boards/${boardId}/cards/${updated.id}`, updated).pipe(
      tap((card) =>
        this._boards.update((list) =>
          list.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              columns: b.columns.map((c) => ({
                ...c,
                cards: c.cards.map((cd) => (cd.id === card.id ? card : cd)),
              })),
            };
          }),
        ),
      ),
    );
  }

  deleteCard(boardId: string, cardId: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/boards/${boardId}/cards/${cardId}`).pipe(
      tap(() =>
        this._boards.update((list) =>
          list.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              columns: b.columns.map((c) => ({
                ...c,
                cards: c.cards.filter((cd) => cd.id !== cardId),
              })),
            };
          }),
        ),
      ),
    );
  }

  moveCard(
    boardId: string,
    cardId: string,
    targetColumnId: string,
    targetIndex: number,
  ): Observable<KanbanBoard> {
    return this.http
      .post<KanbanBoard>(`${BASE}/boards/${boardId}/cards/${cardId}/move`, {
        targetColumnId,
        targetIndex,
      })
      .pipe(
        tap((board) =>
          this._boards.update((list) => list.map((b) => (b.id !== boardId ? b : board))),
        ),
      );
  }
}
