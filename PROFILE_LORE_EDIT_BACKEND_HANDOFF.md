# Backend Handoff — Profile Tabs (seguindo/favoritos) + Lore Edit

## Contexto

O frontend já está implementado e consome os endpoints abaixo. Enquanto o backend não os expõe, as abas ficam vazias (erros são silenciados). Assim que o backend estiver pronto, o frontend passa a funcionar automaticamente.

---

## 1. Lore Edit — `PUT /lore/{id}`

Edição de um artigo de lore existente. O usuário deve ser o autor (ou ter role de moderador).

### Endpoint

```
PUT /lore/{id}
Authorization: Bearer <token>
Content-Type: application/json
```

### Request body (igual ao POST /lore)

```json
{
  "title": "string (obrigatório, mín. 3 chars)",
  "type": "WORLD | CHARACTER",
  "gameId": "string (ID do jogo)",
  "characterName": "string | null (obrigatório se type=CHARACTER)",
  "content": "string (obrigatório, mín. 10 chars)",
  "tags": ["string"] // opcional, máx. 5
}
```

### Response `200 OK`

Retorna o `LoreApi` completo (mesmo shape do `GET /lore/{id}`):

```json
{
  "id": 7,
  "title": "Novo título",
  "content": "...",
  "status": "CANONICO",
  "type": "CHARACTER",
  "characterName": "Ranni",
  "tags": ["magia", "lua"],
  "userId": "vincruz",
  "gameId": 1,
  "gameName": "Elden Ring",
  "items": [],
  "isPersonal": false,
  "ownerId": null,
  "isPublic": true,
  "allowCopy": true,
  "likeCount": 5,
  "userHasLiked": false,
  "followerCount": 3,
  "userIsFollowing": false
}
```

### Erros esperados

| Status | Situação |
|--------|----------|
| `403` | Usuário não é autor nem moderador |
| `404` | Artigo não encontrado |
| `422` | Payload inválido (campos obrigatórios faltando) |

---

## 2. Quests que o usuário segue — `GET /quests/following`

Retorna a lista de quests que o usuário autenticado segue.

### Endpoint

```
GET /quests/following
Authorization: Bearer <token>
```

### Response `200 OK`

Array de `QuestApi[]` (mesmo shape que `GET /quests` retorna no `.content`):

```json
[
  {
    "id": 1,
    "title": "A Queda de Godrick",
    "description": "...",
    "status": "CANONICO",
    "userId": "autor123",
    "gameId": 1,
    "gameName": "Elden Ring",
    "nodes": [],
    "edges": [],
    "relatedQuests": [],
    "isPersonal": false,
    "ownerId": null,
    "isPublic": true,
    "allowCopy": false,
    "likeCount": 12,
    "userHasLiked": false,
    "followerCount": 7,
    "userIsFollowing": true
  }
]
```

> **Nota:** o frontend mapeia via `questApiToSummary()`, então todos os campos do `QuestApi` devem estar presentes.

---

## 3. Quests que o usuário curtiu — `GET /quests/liked`

Retorna a lista de quests que o usuário autenticado curtiu.

### Endpoint

```
GET /quests/liked
Authorization: Bearer <token>
```

### Response `200 OK`

Array de `QuestApi[]` (mesmo shape acima, com `userHasLiked: true` em todos os itens).

---

## 4. Lore que o usuário segue — `GET /lore/following`

Retorna a lista de artigos de lore que o usuário autenticado segue.

### Endpoint

```
GET /lore/following
Authorization: Bearer <token>
```

### Response `200 OK`

Array de `LoreApi[]` (mesmo shape que `GET /lore/{id}`):

```json
[
  {
    "id": 7,
    "title": "Ranni, a Bruxa das Estrelas",
    "content": "...",
    "status": "CANONICO",
    "type": "CHARACTER",
    "characterName": "Ranni",
    "tags": ["magia", "lua"],
    "userId": "vincruz",
    "gameId": 1,
    "gameName": "Elden Ring",
    "items": [],
    "isPersonal": false,
    "ownerId": null,
    "isPublic": true,
    "allowCopy": true,
    "likeCount": 5,
    "userHasLiked": false,
    "followerCount": 3,
    "userIsFollowing": true
  }
]
```

---

## 5. Lore que o usuário curtiu — `GET /lore/liked`

Retorna a lista de artigos de lore que o usuário autenticado curtiu.

### Endpoint

```
GET /lore/liked
Authorization: Bearer <token>
```

### Response `200 OK`

Array de `LoreApi[]` (mesmo shape acima, com `userHasLiked: true` em todos os itens).

---

## Resumo dos endpoints

| Método | Endpoint | Autenticação | Descrição |
|--------|----------|-------------|-----------|
| `PUT` | `/lore/{id}` | obrigatória (autor) | Editar artigo de lore |
| `GET` | `/quests/following` | obrigatória | Quests que o usuário segue |
| `GET` | `/quests/liked` | obrigatória | Quests que o usuário curtiu |
| `GET` | `/lore/following` | obrigatória | Lore que o usuário segue |
| `GET` | `/lore/liked` | obrigatória | Lore que o usuário curtiu |

## Sugestão de implementação SQL (seguindo/curtidos)

Para `GET /quests/following`, a query deve fazer JOIN com a tabela de follows (`quest_followers`) filtrando pelo `userId` do token:

```sql
SELECT q.* FROM quests q
JOIN quest_followers f ON f.quest_id = q.id
WHERE f.user_id = :currentUserId
ORDER BY f.created_at DESC;
```

Mesmo padrão para `/quests/liked` (tabela `quest_likes`), `/lore/following` (tabela `lore_followers`) e `/lore/liked` (tabela `lore_likes`).
