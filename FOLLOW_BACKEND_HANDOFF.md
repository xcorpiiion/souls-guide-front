# Sistema de Follow — Backend Handoff

> **Status: implementado.** Todos os endpoints de follow/unfollow estão no ar e os campos `followerCount` / `userIsFollowing` já aparecem nas listagens e detalhes existentes.

---

## Novos endpoints

Todos retornam o mesmo shape:

```json
{
  "followerCount": 4801,
  "userIsFollowing": true
}
```

| Método   | Path                  | Auth         |
|----------|-----------------------|--------------|
| `POST`   | `/quests/{id}/follow` | obrigatória  |
| `DELETE` | `/quests/{id}/follow` | obrigatória  |
| `POST`   | `/lore/{id}/follow`   | obrigatória  |
| `DELETE` | `/lore/{id}/follow`   | obrigatória  |

### Comportamento de erros

| Situação                              | Status     |
|---------------------------------------|------------|
| POST em follow já existente           | `409 Conflict` |
| DELETE em follow inexistente          | `200 OK` com `userIsFollowing: false` (idempotente) |
| POST/DELETE sem autenticação          | `401 Unauthorized` |

---

## Campos novos nos endpoints existentes

`GET /quests`, `GET /quests/{id}`, `GET /lore` e `GET /lore/{id}` passam a retornar dois campos novos em cada item:

```json
{
  "followerCount": 4800,
  "userIsFollowing": false
}
```

- `followerCount` — sempre presente, mesmo sem autenticação
- `userIsFollowing` — `true` se o usuário logado já segue; `false` se não segue ou não está autenticado

> **Atenção:** esses campos chegam juntos com `likeCount` e `userHasLiked` (implementados anteriormente). Os quatro campos aparecem no mesmo objeto de resposta.

---

## Interfaces TypeScript atualizadas

```typescript
// QuestGuide — acrescentar os dois campos novos
export interface QuestGuide {
  // ...campos já existentes...
  likeCount: number;
  userHasLiked: boolean;
  followerCount: number;    // NOVO
  userIsFollowing: boolean; // NOVO
}

// QuestGuideDetail — idem
export interface QuestGuideDetail {
  // ...campos já existentes (nodes, edges, relatedQuests)...
  likeCount: number;
  userHasLiked: boolean;
  followerCount: number;    // NOVO
  userIsFollowing: boolean; // NOVO
}

// LoreArticle — idem
export interface LoreArticle {
  // ...campos já existentes...
  likeCount: number;
  userHasLiked: boolean;
  followerCount: number;    // NOVO
  userIsFollowing: boolean; // NOVO
}

// Resposta de follow/unfollow
export interface FollowResponse {
  followerCount: number;
  userIsFollowing: boolean;
}
```

---

## Exemplos de chamada no service Angular

```typescript
// QuestService
followQuest(id: number): Observable<FollowResponse> {
  return this.http.post<FollowResponse>(`${this.base}/quests/${id}/follow`, {});
}

unfollowQuest(id: number): Observable<FollowResponse> {
  return this.http.delete<FollowResponse>(`${this.base}/quests/${id}/follow`);
}

// LoreService
followLore(id: number): Observable<FollowResponse> {
  return this.http.post<FollowResponse>(`${this.base}/lore/${id}/follow`, {});
}

unfollowLore(id: number): Observable<FollowResponse> {
  return this.http.delete<FollowResponse>(`${this.base}/lore/${id}/follow`);
}
```

---

## Sugestão de UX para o botão de seguir

```typescript
toggleFollow(quest: QuestGuide) {
  if (!this.authService.isLoggedIn()) {
    // redirecionar para login ou abrir modal
    return;
  }

  const action$ = quest.userIsFollowing
    ? this.questService.unfollowQuest(quest.id)
    : this.questService.followQuest(quest.id);

  action$.subscribe({
    next: (res) => {
      quest.followerCount  = res.followerCount;
      quest.userIsFollowing = res.userIsFollowing;
    },
    error: (err) => {
      if (err.status === 409) {
        quest.userIsFollowing = true;
      }
    }
  });
}
```

---

## Resumo do que mudar no front

| O quê | Onde |
|-------|------|
| Adicionar `followerCount` e `userIsFollowing` em `QuestGuide` | `quest.model.ts` |
| Adicionar `followerCount` e `userIsFollowing` em `QuestGuideDetail` | `quest-detail.model.ts` |
| Adicionar `followerCount` e `userIsFollowing` em `LoreArticle` | `lore.model.ts` |
| Adicionar `FollowResponse` interface | `follow.model.ts` ou inline |
| Adicionar `followQuest()` / `unfollowQuest()` | `quest.service.ts` |
| Adicionar `followLore()` / `unfollowLore()` | `lore.service.ts` |
| Implementar botão de seguir nos cards e páginas de detalhe | componentes de lista/detalhe |
