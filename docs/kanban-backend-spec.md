# Kanban — Especificação de Back-end

## Contexto

O Kanban é um recurso **privado por usuário**. Cada usuário pode ter múltiplos boards, um por personagem/playthrough. Cada board pertence a um jogo e contém colunas, que contêm cards. Os dados ficam isolados: nenhum usuário acessa o board de outro.

O front-end já está completo com dados mockados em memória (`KanbanService`). Assim que os endpoints existirem, o serviço substitui os mocks pelas chamadas HTTP, sem alterar os componentes.

---

## Modelos

### KanbanBoard
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string (UUID)` | Identificador do board |
| `userId` | `string` | Dono do board (vem do JWT) |
| `gameId` | `string` | ID do jogo (referência à tabela de jogos) |
| `gameName` | `string` | Nome do jogo (desnormalizado, facilita leitura) |
| `characterName` | `string` | Nome do personagem/playthrough |
| `createdAt` | `string (ISO 8601)` | Data de criação |
| `columns` | `KanbanColumn[]` | Colunas do board (eager load) |

### KanbanColumn
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string (UUID)` | Identificador da coluna |
| `boardId` | `string` | Board ao qual pertence |
| `title` | `string` | Título da coluna |
| `color` | `'todo' \| 'doing' \| 'done' \| 'stuck' \| 'custom'` | Cor/tipo semântico |
| `position` | `number` | Ordem da coluna (0-based) |
| `cards` | `KanbanCard[]` | Cards da coluna (eager load) |

### KanbanCard
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string (UUID)` | Identificador do card |
| `columnId` | `string` | Coluna atual |
| `title` | `string` | Título do card |
| `tags` | `string[]` | Lista de tags (máx. 6) |
| `priority` | `'normal' \| 'urgent' \| 'blocking'` | Prioridade |
| `notes` | `string` | Notas em texto livre |
| `checklist` | `KanbanChecklist[]` | Itens de checklist |
| `refs` | `KanbanRef[]` | Referências a quests ou outros cards |
| `position` | `number` | Ordem dentro da coluna (0-based) |
| `done` | `boolean` | Card marcado como concluído |

### KanbanChecklist
| Campo | Tipo |
|---|---|
| `id` | `string (UUID)` |
| `label` | `string` |
| `done` | `boolean` |

### KanbanRef
| Campo | Tipo | Descrição |
|---|---|---|
| `type` | `'quest' \| 'card'` | Tipo de referência |
| `label` | `string` | Rótulo exibido |
| `targetId` | `string` | ID do alvo (quest ou card) |
| `targetName` | `string` | Nome do alvo (desnormalizado) |

---

## Endpoints

Todos os endpoints requerem autenticação JWT. O `userId` é extraído do token — nunca aceito no body.

### Boards

#### `GET /api/kanban/boards`
Lista todos os boards do usuário autenticado.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "gameId": "1",
    "gameName": "Elden Ring",
    "characterName": "Ranni Run",
    "createdAt": "2024-06-14T10:00:00Z",
    "columns": [ /* KanbanColumn[] com cards[] */ ]
  }
]
```

> O front-end carrega todos os boards de uma vez (lista pequena). Retornar `columns` e `cards` no mesmo payload evita N+1 requests.

---

#### `POST /api/kanban/boards`
Cria um novo board.

**Body:**
```json
{
  "gameId": "1",
  "gameName": "Elden Ring",
  "characterName": "Ranni Run"
}
```

**Response 201:** KanbanBoard completo (com `columns: []`).

---

#### `DELETE /api/kanban/boards/:id`
Exclui um board e todas as suas colunas e cards.

**Response 204:** sem body.

**Erro:** 403 se o board não pertencer ao usuário autenticado.

---

### Colunas

#### `POST /api/kanban/boards/:boardId/columns`
Adiciona uma nova coluna ao final do board.

**Body:**
```json
{
  "title": "Em andamento",
  "color": "doing"
}
```
> `color` é opcional — default `"custom"`.

**Response 201:** KanbanColumn criada (com `cards: []`).

---

#### `DELETE /api/kanban/boards/:boardId/columns/:columnId`
Exclui uma coluna e todos os seus cards.

**Response 204.**

---

### Cards

#### `POST /api/kanban/boards/:boardId/columns/:columnId/cards`
Adiciona um card ao final da coluna.

**Body:**
```json
{
  "title": "Derrotar Malenia"
}
```

**Response 201:** KanbanCard completo com defaults:
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

#### `PUT /api/kanban/boards/:boardId/cards/:cardId`
Atualiza todos os campos editáveis de um card (replace completo do card).

**Body:** KanbanCard completo (exceto `id`, `columnId` — não movem aqui).
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

**Response 200:** KanbanCard atualizado.

---

#### `DELETE /api/kanban/boards/:boardId/cards/:cardId`
Exclui um card.

**Response 204.**

---

#### `POST /api/kanban/boards/:boardId/cards/:cardId/move`
Move um card para outra coluna (ou reordena dentro da mesma).

**Body:**
```json
{
  "targetColumnId": "uuid",
  "targetIndex": 2
}
```

**Lógica:** remover o card da coluna atual, inserir na coluna alvo na posição `targetIndex`, reordenar `position` de todos os cards afetados.

**Response 200:** KanbanBoard completo atualizado.

---

## Regras de negócio

- Um usuário só acessa boards onde `userId == userId do JWT`. Retornar 403 para qualquer acesso a board alheio.
- Ao deletar um board, excluir em cascata colunas e cards.
- Ao deletar uma coluna, excluir em cascata seus cards.
- `position` nas colunas e cards é gerenciado pelo back-end: sempre retornar ordenado por `position ASC`.
- `checklist` e `refs` podem ser armazenados como JSON (coluna JSONB no Postgres) — são sempre substituídos inteiros no PUT.
- `tags` também pode ser `text[]` ou JSONB.
- Não há limite de boards por usuário (por enquanto).
- `gameName` e `characterName` têm limite de 100 caracteres.
- `title` do card tem limite de 200 caracteres.
- `notes` tem limite de 5000 caracteres.

---

## Sugestão de estrutura de tabelas (PostgreSQL)

```sql
-- Boards
CREATE TABLE kanban_boards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id       TEXT NOT NULL,
  game_name     TEXT NOT NULL,
  character_name TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colunas
CREATE TABLE kanban_columns (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id  UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  color     TEXT NOT NULL DEFAULT 'custom',
  position  INT  NOT NULL DEFAULT 0
);

-- Cards
CREATE TABLE kanban_cards (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id  UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  priority   TEXT NOT NULL DEFAULT 'normal',
  notes      TEXT NOT NULL DEFAULT '',
  checklist  JSONB NOT NULL DEFAULT '[]',
  refs       JSONB NOT NULL DEFAULT '[]',
  position   INT NOT NULL DEFAULT 0,
  done       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_kanban_boards_user ON kanban_boards(user_id);
CREATE INDEX idx_kanban_columns_board ON kanban_columns(board_id);
CREATE INDEX idx_kanban_cards_column ON kanban_cards(column_id);
```

---

## O que o front-end já faz (não precisa mudar)

- `KanbanService` em `src/app/core/services/kanban.service.ts` tem todos os métodos. Ao integrar, substituir o signal de mock por chamadas `HttpClient`.
- Rotas: `GET /kanban` → `KanbanList`, `GET /kanban/:id` → `KanbanBoard`.
- Autenticação: o `HttpClient` já inclui o JWT via interceptor global.
- Tipos TypeScript: `src/app/shared/models/kanban.model.ts` — os campos batem 1:1 com os modelos acima.
