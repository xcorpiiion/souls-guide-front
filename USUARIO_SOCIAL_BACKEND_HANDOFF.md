# Usuário Social — Backend Handoff

## O que foi implementado

Três endpoints novos de conteúdo seguido por usuário + `GameDTO` atualizado com `followerCount` e `userIsFollowing`.

---

## Endpoints novos

### `GET /users/{userId}/following-quests`

Retorna as quests que um usuário segue. Público — não exige autenticação. Se o token for enviado, `userHasLiked` e `userIsFollowing` são preenchidos para o viewer.

**Response `200`:** array de `QuestGuideDTO` (mesmo formato já usado no projeto)

---

### `GET /users/{userId}/following-lore`

Retorna os lores que um usuário segue. Mesmo comportamento.

**Response `200`:** array de `LoreArticleDTO`

---

### `GET /users/{userId}/following-games`

Retorna os jogos que um usuário segue.

**Response `200`:** array de `GameDTO`
```json
[
  {
    "id": 1,
    "name": "Elden Ring",
    "imageUrl": "...",
    "description": "...",
    "followerCount": 231,
    "userIsFollowing": true
  }
]
```

---

## `GET /games/{id}` — campos novos

O endpoint de detalhe do jogo agora retorna dois campos adicionais:

| Campo | Tipo | Descrição |
|---|---|---|
| `followerCount` | `number` | Total de seguidores do jogo |
| `userIsFollowing` | `boolean` | Se o usuário autenticado segue. `false` para anônimos |

**Exemplo:**
```json
{
  "id": 1,
  "name": "Elden Ring",
  "imageUrl": "https://...",
  "description": "...",
  "followerCount": 231,
  "userIsFollowing": true
}
```

---

## Atualização necessária na interface `GameDTO`

```ts
export interface GameDTO {
  id: number;
  name: string;
  imageUrl: string | null;
  description: string | null;
  followerCount: number;      // novo
  userIsFollowing: boolean;   // novo
}
```

---

## O que o front precisa fazer

### 1. Atualizar `GameDTO` / model

Adicionar os dois campos novos (já documentado acima).

### 2. `game.service.ts` — verificar se `getById` já existe

O `GET /games/{id}` agora retorna os campos novos. Sem mudança no endpoint, só na interface.

### 3. Página de detalhe do jogo (`game-detail`)

- Exibir `followerCount` e botão follow/unfollow com estado vindo de `userIsFollowing`
- Os endpoints `POST/DELETE /games/{id}/follow` já existem (ver `GAME_FOLLOW_BACKEND_HANDOFF.md`)

### 4. Perfil público — abas de conteúdo seguido

Quando o usuário abre o perfil de outra pessoa, as abas "Quests seguidas", "Lore seguido" e "Jogos seguidos" devem chamar:

| Aba | Endpoint |
|---|---|
| Quests seguidas | `GET /users/{userId}/following-quests` |
| Lore seguido | `GET /users/{userId}/following-lore` |
| Jogos seguidos | `GET /users/{userId}/following-games` |

O `userId` vem do campo `id` retornado por `GET /users/handle/{handle}`.

### 5. `user.service.ts` — adicionar os três métodos

```ts
getFollowingQuests(userId: string): Observable<QuestGuideDTO[]>
getFollowingLore(userId: string): Observable<LoreArticleDTO[]>
getFollowingGames(userId: string): Observable<GameDTO[]>
```

---

## Resumo de todos os endpoints de perfil público (visão completa)

| Endpoint | Descrição | Auth |
|---|---|---|
| `GET /users/handle/{handle}` | Dados do perfil + counts | Não |
| `GET /quests/by-user/{userId}` | Quests criadas pelo usuário | Não |
| `GET /lore/by-user/{userId}` | Lores criados pelo usuário | Não |
| `GET /users/{userId}/followers` | Seguidores | Não |
| `GET /users/{userId}/following` | Quem o usuário segue | Não |
| `GET /users/{userId}/following-quests` | Quests que o usuário segue | Não |
| `GET /users/{userId}/following-lore` | Lores que o usuário segue | Não |
| `GET /users/{userId}/following-games` | Jogos que o usuário segue | Não |
| `GET /quests/liked` | Quests curtidas (só próprio perfil) | Sim |
| `GET /lore/liked` | Lores curtidos (só próprio perfil) | Sim |
