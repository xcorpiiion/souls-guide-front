# Prompt — Implementar back-end do Kanban (SoulGuide)

Use este prompt para passar a um agente de IA (ou desenvolvedor) implementar os endpoints do Kanban.

---

## Contexto do projeto

Este é o back-end do **SoulGuide**, uma plataforma de guias colaborativos para jogos souls-like. O projeto usa **Spring Boot** (Java 21) com PostgreSQL, autenticação via JWT (Keycloak / OAuth2 Resource Server), e segue o padrão de arquitetura já existente no repositório:

- Controllers em `controllers/`
- Serviços com interface em `services/` e implementação em `services/impl/`
- Repositórios Spring Data JPA em `repositories/`
- Entidades JPA (herdam `GenericData`) em `entities/`
- DTOs como Java records em `dto/`
- Respostas sempre envoltas em `Response<T>`
- Exceções de domínio: `BusinessException` (com status HTTP) para erros de negócio, `BusinessRequestException` para validação
- Segurança por método: `@PreAuthorize` nas camadas de serviço/controller
- Auditoria opcional via `@LoggableAction`

A especificação completa dos endpoints, modelos e regras de negócio está em `docs/kanban-backend-spec.md` (no repositório do front-end). Leia esse arquivo antes de começar.

---

## O que implementar

Implemente o recurso **Kanban** completo seguindo o padrão do projeto. A entrega deve incluir:

### 1. Entidades JPA

- `KanbanBoard` — herda `GenericData`, campos: `userId`, `gameId`, `gameName`, `characterName`
- `KanbanColumn` — `boardId` (FK), `title`, `color`, `position`; `@OneToMany` com cards
- `KanbanCard` — `columnId` (FK), `title`, `priority`, `notes`, `done`, `position`; campos JSON: `tags` (`text[]` ou `@JdbcTypeCode(SqlTypes.JSON)`), `checklist` e `refs` como `@JdbcTypeCode(SqlTypes.JSON)` mapeando para records/classes Java

> `checklist` e `refs` são substituídos inteiros no update — não precisam de tabelas separadas.

### 2. DTOs (Java records)

- `KanbanBoardResponse` — retorno completo com lista de colunas e cards
- `KanbanColumnResponse`
- `KanbanCardResponse`
- `CreateBoardRequest` — `gameId`, `gameName`, `characterName` (todos `@NotBlank`)
- `CreateColumnRequest` — `title` (`@NotBlank`), `color` (opcional, default `"custom"`)
- `CreateCardRequest` — `title` (`@NotBlank`)
- `UpdateCardRequest` — todos os campos editáveis do card
- `MoveCardRequest` — `targetColumnId` (`@NotBlank`), `targetIndex` (`@PositiveOrZero`)

### 3. Repositórios

- `KanbanBoardRepository` — findAllByUserId, findByIdAndUserId
- `KanbanColumnRepository` — findAllByBoardIdOrderByPosition, findByIdAndBoardId
- `KanbanCardRepository` — findAllByColumnIdOrderByPosition, findByIdAndColumnId

### 4. Serviço

Interface `KanbanService` + `KanbanServiceImpl` com os métodos:

```
listBoards(userId)
createBoard(userId, CreateBoardRequest)
deleteBoard(userId, boardId)
addColumn(userId, boardId, CreateColumnRequest)
deleteColumn(userId, boardId, columnId)
addCard(userId, boardId, columnId, CreateCardRequest)
updateCard(userId, boardId, cardId, UpdateCardRequest)
deleteCard(userId, boardId, cardId)
moveCard(userId, boardId, cardId, MoveCardRequest)
```

**Regras obrigatórias:**
- Sempre validar que o board pertence ao `userId` antes de qualquer operação. Lançar `BusinessException(HttpStatus.FORBIDDEN)` se não pertencer.
- Ao mover um card: remover da coluna atual, inserir na coluna alvo no `targetIndex`, reordenar `position` de todos os cards das duas colunas afetadas.
- Ao deletar coluna ou board: a cascata do JPA/banco cuida das entidades filhas — não deletar manualmente.

### 5. Controller

`KanbanController` em `controllers/`, mapeado para `/api/kanban`:

| Método | Path | Body | Response |
|---|---|---|---|
| GET | `/boards` | — | `Response<List<KanbanBoardResponse>>` |
| POST | `/boards` | `CreateBoardRequest` | `Response<KanbanBoardResponse>` 201 |
| DELETE | `/boards/{boardId}` | — | 204 |
| POST | `/boards/{boardId}/columns` | `CreateColumnRequest` | `Response<KanbanColumnResponse>` 201 |
| DELETE | `/boards/{boardId}/columns/{columnId}` | — | 204 |
| POST | `/boards/{boardId}/columns/{columnId}/cards` | `CreateCardRequest` | `Response<KanbanCardResponse>` 201 |
| PUT | `/boards/{boardId}/cards/{cardId}` | `UpdateCardRequest` | `Response<KanbanCardResponse>` |
| DELETE | `/boards/{boardId}/cards/{cardId}` | — | 204 |
| POST | `/boards/{boardId}/cards/{cardId}/move` | `MoveCardRequest` | `Response<KanbanBoardResponse>` |

O `userId` deve ser extraído do JWT (via `Authentication` / `@AuthenticationPrincipal`) — nunca aceito no body ou como parâmetro de URL.

### 6. Migration SQL (Flyway)

Criar arquivo `V{próximo_número}__create_kanban_tables.sql` com as tabelas `kanban_boards`, `kanban_columns`, `kanban_cards` e índices (estrutura está na spec).

### 7. Testes

- `KanbanServiceImplTest` com `@ExtendWith(MockitoExtension.class)` cobrindo: listBoards, createBoard, deleteBoard (próprio e alheio → 403), addColumn, addCard, updateCard, moveCard
- `KanbanControllerTest` com `@WebMvcTest` cobrindo os endpoints principais (happy path + 403)

---

## O que NÃO fazer

- Não criar autenticação própria — o JWT já está configurado globalmente
- Não alterar o front-end — ele já está completo e integra assim que os endpoints existirem
- Não criar endpoints de admin ou listagem de boards de outros usuários
- Não implementar paginação — a lista de boards é pequena (por usuário)

---

## Como o front-end vai integrar

O `KanbanService` (`src/app/core/services/kanban.service.ts`) tem todos os métodos. O desenvolvedor front-end substituirá o signal de mock por chamadas `HttpClient` apontando para os endpoints acima. Os nomes dos campos nos JSONs devem bater com os tipos em `src/app/shared/models/kanban.model.ts`.
