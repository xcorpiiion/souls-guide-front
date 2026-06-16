# SoulGuide — Handoff Back-end → Front-end: Quests e Lore de Perfil

> **Status:** Back-end implementado e testado (88 testes passando). Tudo pronto para integração.

---

## Resumo do que mudou

Os tipos `QuestGuide` e `LoreArticle` ganharam 5 campos novos. Endpoints existentes mudaram comportamento. 14 endpoints novos foram adicionados.

---

## Campos novos nos tipos existentes

### `QuestGuide` (response de `GET /quests`, `GET /quests/{id}`, `POST /quests`, `PUT /quests/{id}`)

```typescript
export interface QuestGuide {
  // campos existentes...
  id: number;
  title: string;
  description: string | null;
  status: string;
  userId: string;
  gameId: number;
  gameName: string;
  // NOVOS:
  isPersonal: boolean;   // true = pertence ao perfil de um usuário
  ownerId: string | null;
  isPublic: boolean;
  allowCopy: boolean;
  likeCount: number;
}
```

### `LoreArticle` (response de `GET /lore`, `GET /lore/{id}`, `POST /lore`, `PUT /lore/{id}`)

```typescript
export interface LoreArticle {
  // campos existentes...
  id: number;
  title: string;
  content: string;
  status: string;
  type: 'WORLD' | 'CHARACTER';
  characterName: string | null;
  tags: string[];
  userId: string;
  gameId: number;
  gameName: string;
  items: ItemDTO[];
  // NOVOS:
  isPersonal: boolean;
  ownerId: string | null;
  isPublic: boolean;
  allowCopy: boolean;
  likeCount: number;
}
```

---

## Mudanças em endpoints existentes

### `GET /quests` e `GET /lore`

**Agora retornam apenas conteúdo da comunidade** (`isPersonal: false`). Quests/lores de perfil não aparecem mais nestas listagens — elas ficam em `/users/{userId}/quests` e `/users/{userId}/lore`.

### `GET /quests/{id}` e `GET /lore/{id}`

Se o conteúdo for pessoal e privado (`isPersonal: true` e `isPublic: false`), retorna `403` para quem não é o dono. O front deve tratar este 403 exibindo uma mensagem de "conteúdo privado".

### `PUT /quests/{id}` e `PUT /lore/{id}` (edição da comunidade)

Se tentar editar um conteúdo com `isPersonal: true` por esta rota, retorna `403`. Conteúdo de perfil deve ser editado via `PUT /quests/personal/{id}` ou `PUT /lore/personal/{id}`.

---

## Novos endpoints

### Quests de perfil

#### Criar quest de perfil
**`POST /quests/personal`** — autenticado — `201 Created`

```json
{
  "title": "Minha guia da Questline Ranni",
  "description": "Passo a passo completo...",
  "gameId": 1,
  "isPublic": true,
  "allowCopy": true
}
```

Response: objeto `QuestGuide` completo (com `isPersonal: true`, `ownerId` preenchido).

Erros:
| Status | Motivo |
|--------|--------|
| `401` | Não autenticado |
| `422` | `title` vazio ou `gameId` nulo |

---

#### Editar quest de perfil
**`PUT /quests/personal/{id}`** — autenticado — `200 OK`

Mesmo body do `POST /quests/personal`. Retorna `403` se não for o dono.

---

#### Deletar quest de perfil
**`DELETE /quests/personal/{id}`** — autenticado — `204 No Content`

Retorna `403` se não for o dono.

---

#### Copiar quest para o perfil
**`POST /quests/{id}/copy-to-profile`** — autenticado

Body (opcional):
```json
{ "replaceExistingId": null }
```

Responses:
- `201 Created` — objeto `QuestGuide` da nova quest no perfil
- `409 Conflict` — já existe uma quest com o mesmo título no perfil do usuário:

```json
{
  "message": "Já existe conteúdo com este título no seu perfil",
  "conflictingId": 42,
  "conflictingTitle": "Minha guia da Questline Ranni"
}
```

Para resolver o conflito, reenviar com `replaceExistingId: 42` — isso deleta a quest antiga e cria a nova.

Outros erros:
| Status | Motivo |
|--------|--------|
| `401` | Não autenticado |
| `403` | `allowCopy: false` na origem, ou quest pessoal privada |
| `404` | Quest de origem não encontrada |

---

#### Like / Unlike em quest de perfil
**`POST /quests/personal/{id}/like`** — autenticado — `200 OK`
**`DELETE /quests/personal/{id}/like`** — autenticado — `200 OK`

Response de ambos:
```json
{ "likeCount": 42, "userHasLiked": true }
```

Erros:
| Status | Ação | Motivo |
|--------|------|--------|
| `403` | POST like | Tentou curtir o próprio conteúdo |
| `409` | POST like | Já curtiu |
| `404` | DELETE like | Não tinha like registrado |

---

### Lore de perfil

Endpoints espelhados. Tudo igual, trocando `/quests` por `/lore`:

| Método | URL | Status de sucesso |
|--------|-----|-------------------|
| `POST` | `/lore/personal` | `201` |
| `PUT` | `/lore/personal/{id}` | `200` |
| `DELETE` | `/lore/personal/{id}` | `204` |
| `POST` | `/lore/{id}/copy-to-profile` | `201` ou `409` |
| `POST` | `/lore/personal/{id}/like` | `200` |
| `DELETE` | `/lore/personal/{id}/like` | `200` |

#### Body para `POST /lore/personal` e `PUT /lore/personal/{id}`

```json
{
  "title": "Minha análise sobre Ranni",
  "content": "## Ranni, a Bruxa\n\nRanni é...",
  "type": "CHARACTER",
  "gameId": 1,
  "characterName": "Ranni",
  "tags": ["personagem", "destino"],
  "itemIds": [],
  "isPublic": true,
  "allowCopy": true
}
```

#### `POST /lore/{id}/copy-to-profile` com filterType

```json
{
  "filterType": "all",
  "replaceExistingId": null
}
```

- `"all"` → copia qualquer tipo
- `"character"` → só copia se o artigo for `type: "CHARACTER"`, retorna `400` caso contrário
- `"world"` → só copia se o artigo for `type: "WORLD"`, retorna `400` caso contrário

---

### Listar conteúdo de um usuário (público)

#### `GET /users/{userId}/quests` — pública — `200 OK`

Retorna lista (não paginada) de quests de perfil do usuário.
- Para terceiros: só as com `isPublic: true`
- Para o próprio dono (token JWT com `userId` igual): todas, incluindo privadas

```json
[
  {
    "id": 1,
    "title": "Minha guia da Questline Ranni",
    "isPersonal": true,
    "ownerId": "1",
    "isPublic": true,
    "allowCopy": true,
    "likeCount": 7,
    ...
  }
]
```

#### `GET /users/{userId}/lore` — pública — `200 OK`

Mesmo comportamento para lore de perfil.

---

## Interfaces TypeScript completas

```typescript
export interface PersonalQuestRequest {
  title: string;
  description?: string;
  gameId: number;
  isPublic: boolean;
  allowCopy: boolean;
}

export interface PersonalLoreRequest {
  title: string;
  content: string;
  type: 'WORLD' | 'CHARACTER';
  gameId: number;
  characterName?: string;
  tags?: string[];
  itemIds?: number[];
  isPublic: boolean;
  allowCopy: boolean;
}

export interface CopyToProfileRequest {
  replaceExistingId?: number | null;
}

export interface CopyLoreToProfileRequest {
  filterType?: 'all' | 'world' | 'character';
  replaceExistingId?: number | null;
}

export interface LikeResponse {
  likeCount: number;
  userHasLiked: boolean;
}

export interface CopyConflictResponse {
  message: string;
  conflictingId: number;
  conflictingTitle: string;
}
```

---

## Mapeamento de erros por ação

| Ação | Status | Toast / mensagem sugerida |
|------|--------|--------------------------|
| Copiar para perfil | `403` | "Este conteúdo não permite cópias" |
| Copiar para perfil | `409` | Mostrar modal de substituição com `conflictingId` |
| Editar/Deletar conteúdo alheio | `403` | "Você não tem permissão" |
| Like no próprio conteúdo | `403` | "Não é possível curtir o próprio conteúdo" |
| Like duplicado | `409` | "Você já curtiu este conteúdo" |
| Unlike sem like | `404` | ignorar (UI já deve controlar o estado) |
| Acessar privado | `403` | "Este conteúdo é privado" |
| PUT /quests/{id} em conteúdo pessoal | `403` | "Use a edição de perfil" |

---

## O que NÃO mudou

- `GET /quests` e `GET /lore` — mesmas URLs, só o filtro interno mudou (excluem `isPersonal: true` automaticamente)
- Fluxo de criação de comunidade (`POST /quests`, `POST /lore`) — sem alterações
- Versionamento (`/versions`, `/vote-revert`) — só se aplica à comunidade, sem mudanças
- Autenticação — mesmo Bearer token JWT
