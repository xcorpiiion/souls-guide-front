# Kanban — Backend Handoff

> **Status: implementado e commitado.** Todos os endpoints estão no ar. Substitua os mocks do `KanbanService` pelas chamadas HTTP abaixo.

---

## Base URL

```
http://localhost:8765/souls-guide-api/api/kanban
```

Todos os endpoints requerem `Authorization: Bearer {token}`.

---

## Tipos TypeScript (sem mudança nos modelos existentes)

```typescript
export interface KanbanBoard {
  id: string;           // UUID
  userId: string;
  gameId: string;
  gameName: string;
  characterName: string;
  createdAt: string;    // ISO 8601
  columns: KanbanColumn[];
}

export interface KanbanColumn {
  id: string;           // UUID
  boardId: string;
  title: string;
  color: 'todo' | 'doing' | 'done' | 'stuck' | 'custom';
  position: number;
  cards: KanbanCard[];
}

export interface KanbanCard {
  id: string;           // UUID
  columnId: string;
  title: string;
  tags: string[];
  priority: 'normal' | 'urgent' | 'blocking';
  notes: string;
  checklist: ChecklistItem[];
  refs: KanbanRef[];
  position: number;
  done: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface KanbanRef {
  type: 'quest' | 'card';
  label: string;
  targetId: string;
  targetName: string;
}
```

---

## Endpoints

### `GET /api/kanban/boards`
Lista todos os boards do usuário. Retorna colunas e cards já aninhados — sem requests extras.

**Response 200:** `KanbanBoard[]`

---

### `POST /api/kanban/boards`
Cria um board novo.

**Body:**
```json
{
  "gameId": "1",
  "gameName": "Elden Ring",
  "characterName": "Ranni Run"
}
```

**Response 201:** `KanbanBoard` (com `columns: []`)

---

### `DELETE /api/kanban/boards/:boardId`
Exclui o board e tudo que está dentro (cascade).

**Response 204** — sem body.

**Erro 403** se o board não pertencer ao usuário autenticado.

---

### `POST /api/kanban/boards/:boardId/columns`
Adiciona uma coluna ao final do board.

**Body:**
```json
{
  "title": "Em andamento",
  "color": "doing"
}
```
> `color` é opcional — default `"custom"`.

**Response 201:** `KanbanColumn` (com `cards: []`)

---

### `DELETE /api/kanban/boards/:boardId/columns/:columnId`
Exclui a coluna e todos os seus cards.

**Response 204.**

---

### `POST /api/kanban/boards/:boardId/columns/:columnId/cards`
Adiciona um card ao final da coluna.

**Body:**
```json
{ "title": "Derrotar Malenia" }
```

**Response 201:** `KanbanCard` com defaults:
```json
{
  "id": "uuid",
  "columnId": "uuid",
  "title": "Derrotar Malenia",
  "tags": [],
  "priority": "normal",
  "notes": "",
  "checklist": [],
  "refs": [],
  "position": 0,
  "done": false
}
```

---

### `PUT /api/kanban/boards/:boardId/cards/:cardId`
Atualiza todos os campos editáveis do card (replace completo — não use PATCH).

**Body:**
```json
{
  "title": "Derrotar Malenia",
  "tags": ["boss", "endgame"],
  "priority": "blocking",
  "notes": "Usar técnica waterfowl dance dodge",
  "checklist": [
    { "id": "ck-1", "label": "Aprender lifesteal", "done": false }
  ],
  "refs": [],
  "done": false
}
```

**Response 200:** `KanbanCard` atualizado.

---

### `DELETE /api/kanban/boards/:boardId/cards/:cardId`
Exclui o card.

**Response 204.**

---

### `POST /api/kanban/boards/:boardId/cards/:cardId/move`
Move um card para outra coluna ou reordena dentro da mesma. O back-end recomputa todos os `position` afetados.

**Body:**
```json
{
  "targetColumnId": "uuid-da-coluna-destino",
  "targetIndex": 2
}
```

**Response 200:** `KanbanBoard` completo atualizado (use para re-renderizar o board inteiro após drag-and-drop).

---

## Erros comuns

| Status | Quando |
|--------|--------|
| `401`  | Token ausente ou expirado |
| `403`  | Board pertence a outro usuário |
| `404`  | Board / coluna / card não encontrado |
| `422`  | Payload inválido (campo obrigatório vazio, tamanho excedido) |

---

## Exemplo de service Angular

```typescript
// kanban.service.ts
private readonly base = `${environment.apiUrl}/api/kanban`;

getBoards(): Observable<KanbanBoard[]> {
  return this.http.get<KanbanBoard[]>(`${this.base}/boards`);
}

createBoard(data: { gameId: string; gameName: string; characterName: string }): Observable<KanbanBoard> {
  return this.http.post<KanbanBoard>(`${this.base}/boards`, data);
}

deleteBoard(boardId: string): Observable<void> {
  return this.http.delete<void>(`${this.base}/boards/${boardId}`);
}

addColumn(boardId: string, data: { title: string; color?: string }): Observable<KanbanColumn> {
  return this.http.post<KanbanColumn>(`${this.base}/boards/${boardId}/columns`, data);
}

deleteColumn(boardId: string, columnId: string): Observable<void> {
  return this.http.delete<void>(`${this.base}/boards/${boardId}/columns/${columnId}`);
}

addCard(boardId: string, columnId: string, title: string): Observable<KanbanCard> {
  return this.http.post<KanbanCard>(
    `${this.base}/boards/${boardId}/columns/${columnId}/cards`,
    { title }
  );
}

updateCard(boardId: string, cardId: string, card: Partial<KanbanCard>): Observable<KanbanCard> {
  return this.http.put<KanbanCard>(`${this.base}/boards/${boardId}/cards/${cardId}`, card);
}

deleteCard(boardId: string, cardId: string): Observable<void> {
  return this.http.delete<void>(`${this.base}/boards/${boardId}/cards/${cardId}`);
}

moveCard(boardId: string, cardId: string, targetColumnId: string, targetIndex: number): Observable<KanbanBoard> {
  return this.http.post<KanbanBoard>(
    `${this.base}/boards/${boardId}/cards/${cardId}/move`,
    { targetColumnId, targetIndex }
  );
}
```

---

## O que mudar no front

| O quê | Onde |
|-------|------|
| Substituir signal de mock por `getBoards()` | `KanbanService` |
| Chamar `createBoard()` no formulário de novo board | componente de criação |
| Chamar `deleteBoard()` no botão de excluir | componente de board |
| Chamar `addColumn()` / `deleteColumn()` | componente de colunas |
| Chamar `addCard()` no botão `+` de cada coluna | componente de card |
| Chamar `updateCard()` ao salvar o modal de edição | modal de card |
| Chamar `moveCard()` no drop do drag-and-drop | diretiva/componente de drag |
| Tratar `403` ao tentar acessar board de outro user | guard ou interceptor |
