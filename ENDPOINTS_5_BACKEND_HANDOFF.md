# 5 Endpoints Novos — Backend Handoff

> **Status: implementado.** Todos os endpoints estão no ar. As telas que estavam em branco devem funcionar assim que o front consumir as rotas corretas.

---

## 1. Editar artigo de lore — `PUT /lore/{id}`

> **Já existia** no backend, mas agora tem duas melhorias: proteção de autoria e campos de likes/follows na resposta.

```
PUT http://localhost:8765/souls-guide-api/lore/{id}
Authorization: Bearer {token}   ← obrigatório
```

**Request body** (mesmo shape do `POST /lore`):
```json
{
  "title": "string (mín. 3 chars)",
  "type": "WORLD | CHARACTER",
  "gameId": 1,
  "characterName": "Ranni",
  "content": "string (mín. 10 chars)",
  "tags": ["magia", "demi-deus"]
}
```

**Response `200 OK`** — `LoreArticleDTO` completo, incluindo todos os campos de likes e follows:
```json
{
  "id": 7,
  "title": "A origem de Ranni",
  "content": "...",
  "status": "TEORIA",
  "type": "CHARACTER",
  "characterName": "Ranni",
  "tags": ["magia"],
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

**Erros:**
| Status | Quando |
|--------|--------|
| `401`  | Sem token |
| `403`  | Usuário não é o autor do artigo |
| `403`  | Artigo é pessoal (editar via rota específica) |
| `404`  | Artigo não encontrado |
| `422`  | Payload inválido |

---

## 2. Quests que o usuário segue — `GET /quests/following`

```
GET http://localhost:8765/souls-guide-api/quests/following
Authorization: Bearer {token}   ← obrigatório
```

**Response `200 OK`** — `QuestGuideDTO[]` ordenado por data de follow (mais recente primeiro). Pode ser `[]` se não segue nenhuma.

Todos os campos do `GET /quests` estão presentes, com `userIsFollowing: true` em todos os itens.

```json
[
  {
    "id": 3,
    "title": "Questline Ranni",
    "status": "CANONICO",
    "userId": "outro-user",
    "gameId": 1,
    "gameName": "Elden Ring",
    "likeCount": 12,
    "userHasLiked": true,
    "followerCount": 48,
    "userIsFollowing": true
  }
]
```

---

## 3. Quests que o usuário curtiu — `GET /quests/liked`

```
GET http://localhost:8765/souls-guide-api/quests/liked
Authorization: Bearer {token}   ← obrigatório
```

**Response `200 OK`** — `QuestGuideDTO[]` ordenado por data de curtida. `userHasLiked: true` em todos. Pode ser `[]`.

---

## 4. Lore que o usuário segue — `GET /lore/following`

```
GET http://localhost:8765/souls-guide-api/lore/following
Authorization: Bearer {token}   ← obrigatório
```

**Response `200 OK`** — `LoreArticleDTO[]` ordenado por data de follow. `userIsFollowing: true` em todos. Pode ser `[]`.

---

## 5. Lore que o usuário curtiu — `GET /lore/liked`

```
GET http://localhost:8765/souls-guide-api/lore/liked
Authorization: Bearer {token}   ← obrigatório
```

**Response `200 OK`** — `LoreArticleDTO[]` ordenado por data de curtida. `userHasLiked: true` em todos. Pode ser `[]`.

---

## Interfaces TypeScript — sem mudança estrutural

Os shapes de `QuestGuide` e `LoreArticle` são os mesmos das implementações anteriores (likes + follows). Nenhum campo novo para adicionar nas interfaces — o `PUT /lore/{id}` retorna o mesmo `LoreArticle` que o `GET /lore/{id}`.

---

## Exemplos de chamada no service Angular

```typescript
// QuestService
getFollowingQuests(): Observable<QuestGuide[]> {
  return this.http.get<QuestGuide[]>(`${this.base}/quests/following`);
}

getLikedQuests(): Observable<QuestGuide[]> {
  return this.http.get<QuestGuide[]>(`${this.base}/quests/liked`);
}

// LoreService
getFollowingLore(): Observable<LoreArticle[]> {
  return this.http.get<LoreArticle[]>(`${this.base}/lore/following`);
}

getLikedLore(): Observable<LoreArticle[]> {
  return this.http.get<LoreArticle[]>(`${this.base}/lore/liked`);
}

updateLore(id: number, body: LoreArticleRequest): Observable<LoreArticle> {
  return this.http.put<LoreArticle>(`${this.base}/lore/${id}`, body);
}
```

---

## Resumo do que mudar no front

| O quê | Onde |
|-------|------|
| Chamar `PUT /lore/{id}` na tela de edição de artigo | componente de edição de lore |
| Tratar `403` quando usuário não é o autor | mesma tela |
| Chamar `GET /quests/following` na tela "Quests que sigo" | componente de perfil / atividade |
| Chamar `GET /quests/liked` na tela "Quests que curti" | componente de perfil / atividade |
| Chamar `GET /lore/following` na tela "Lore que sigo" | componente de perfil / atividade |
| Chamar `GET /lore/liked` na tela "Lore que curti" | componente de perfil / atividade |
