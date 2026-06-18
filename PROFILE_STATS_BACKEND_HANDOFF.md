# Profile Stats — Backend Handoff

## O que foi implementado no back-end

Dois endpoints novos + confirmação de que os demais já existiam.

---

## Mapa completo de endpoints para o perfil

### ✅ Já existiam — só precisam ser chamados

| Endpoint | Descrição |
|---|---|
| `GET /users/handle/{handle}` | Perfil público com counts reais |
| `GET /users/{userId}/followers` | Lista de seguidores |
| `GET /users/{userId}/following` | Lista de quem o usuário segue |
| `GET /quests/following` | Quests que o usuário autenticado segue |
| `GET /quests/liked` | Quests que o usuário autenticado curtiu |
| `GET /lore/following` | Lores que o usuário autenticado segue |
| `GET /lore/liked` | Lores que o usuário autenticado curtiu |

### 🆕 Criados agora

| Endpoint | Descrição |
|---|---|
| `GET /quests/by-user/{userId}` | Quests públicas de um usuário |
| `GET /lore/by-user/{userId}` | Lores públicos de um usuário |

---

## Detalhes dos endpoints novos

### `GET /quests/by-user/{userId}`

Retorna todas as quests públicas (não-pessoais) de um usuário, ordenadas da mais recente para a mais antiga. Não exige autenticação — se o token for enviado, `userHasLiked` e `userIsFollowing` são preenchidos corretamente.

**Response `200`:** array de `QuestGuideDTO`
```json
[
  {
    "id": 12,
    "title": "Como derrotar Malenia",
    "description": "...",
    "status": "CANONICO",
    "userId": "42",
    "gameId": 1,
    "gameName": "Elden Ring",
    "isPersonal": false,
    "isPublic": true,
    "likeCount": 38,
    "userHasLiked": false,
    "followerCount": 14,
    "userIsFollowing": false,
    "hidden": false,
    "hiddenReason": null,
    "hiddenIsSpoiler": false
  }
]
```

---

### `GET /lore/by-user/{userId}`

Retorna todos os lores públicos de um usuário. Mesma lógica do anterior.

**Response `200`:** array de `LoreArticleDTO`
```json
[
  {
    "id": 5,
    "title": "A origem dos Dedos de Ouro",
    "status": "CONSOLIDADO",
    "type": "WORLD",
    "userId": "42",
    "gameId": 1,
    "gameName": "Elden Ring",
    "likeCount": 12,
    "userHasLiked": false,
    "followerCount": 3,
    "userIsFollowing": false
  }
]
```

---

## `GET /users/handle/{handle}` — campos retornados

Esse endpoint já existia e já retorna os counts corretos. O front só precisa usá-los diretamente.

```json
{
  "id": "42",
  "name": "Vinicius Cruz",
  "handle": "lordofcinder99",
  "bio": "...",
  "joinedLabel": "jan 2024",
  "questCount": 7,
  "loreCount": 3,
  "followerCount": 120,
  "followingCount": 45,
  "isFollowing": true
}
```

---

## gameCount — como calcular no front

Não há endpoint para isso. O front calcula sozinho a partir das listas:

```ts
const gameCount = new Set([
  ...quests.map(q => q.gameId),
  ...lores.map(l => l.gameId)
]).size;
```

---

## Fluxo recomendado para carregar o perfil

```
GET /users/handle/{handle}
    → preenche nome, bio, joinedLabel, questCount, loreCount, followerCount, followingCount, isFollowing

GET /quests/by-user/{userId}   (userId vem do campo "id" da resposta acima)
    → popula aba de quests
    → calcula gameCount junto com os lores

GET /lore/by-user/{userId}
    → popula aba de lore
    → finaliza cálculo do gameCount

(Abas extras — só quando o usuário clicar)
GET /users/{userId}/followers
GET /users/{userId}/following
GET /quests/following   ← só funciona autenticado, para o perfil próprio
GET /quests/liked       ← idem
GET /lore/following     ← idem
GET /lore/liked         ← idem
```

---

## Observação sobre autenticação

- `GET /quests/by-user/{userId}` e `GET /lore/by-user/{userId}` — **públicos**, não precisam de token
- `GET /quests/following`, `/quests/liked`, `/lore/following`, `/lore/liked` — **exigem token** (só fazem sentido para o perfil do próprio usuário logado)
- `GET /users/{userId}/followers` e `/following` — **públicos**
