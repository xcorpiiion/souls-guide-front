# Sistema de Likes — Backend Handoff

> **Status: implementado.** Todos os endpoints de like/unlike estão no ar e os campos `likeCount` / `userHasLiked` já aparecem nas listagens e detalhes existentes.

---

## Novos endpoints

Todos retornam o mesmo shape:

```json
{
  "likeCount": 42,
  "userHasLiked": true
}
```

| Método   | Path                | Auth         |
|----------|---------------------|--------------|
| `POST`   | `/quests/{id}/like` | obrigatória  |
| `DELETE` | `/quests/{id}/like` | obrigatória  |
| `POST`   | `/lore/{id}/like`   | obrigatória  |
| `DELETE` | `/lore/{id}/like`   | obrigatória  |

### Comportamento de erros

| Situação                              | Status     |
|---------------------------------------|------------|
| POST em like já existente             | `409 Conflict` |
| DELETE em like inexistente            | `200 OK` com `userHasLiked: false` (idempotente) |
| POST/DELETE sem autenticação          | `401 Unauthorized` |

---

## Campos novos nos endpoints existentes

Os endpoints `GET /quests`, `GET /quests/{id}`, `GET /lore` e `GET /lore/{id}` passam a retornar dois campos novos em cada item:

```json
{
  "likeCount": 5,
  "userHasLiked": false
}
```

- `likeCount` — sempre presente, mesmo sem autenticação
- `userHasLiked` — `true` se o usuário logado já curtiu; `false` se não curtiu ou não está autenticado

---

## Interfaces TypeScript atualizadas

```typescript
// Adicionar em QuestGuide (usado em GET /quests e GET /quests/{id})
export interface QuestGuide {
  id: number;
  title: string;
  description: string;
  status: 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';
  userId: string;
  gameId: number;
  gameName: string;
  isPersonal: boolean;
  ownerId: string;
  isPublic: boolean;
  allowCopy: boolean;
  likeCount: number;      // já existia
  userHasLiked: boolean;  // NOVO
}

// QuestGuideDetail (GET /quests/{id}) também ganhou os dois campos
export interface QuestGuideDetail extends QuestGuide {
  nodes: QuestNode[];
  edges: QuestEdge[];
  relatedQuests: RelatedQuest[];
  likeCount: number;      // NOVO no detail
  userHasLiked: boolean;  // NOVO no detail
}

// Adicionar em LoreArticle (usado em GET /lore e GET /lore/{id})
export interface LoreArticle {
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
  items: Item[];
  isPersonal: boolean;
  ownerId: string;
  isPublic: boolean;
  allowCopy: boolean;
  likeCount: number;      // já existia
  userHasLiked: boolean;  // NOVO
}

// Resposta de like/unlike
export interface LikeResponse {
  likeCount: number;
  userHasLiked: boolean;
}
```

---

## Exemplos de chamada no service Angular

```typescript
// QuestService
likeQuest(id: number): Observable<LikeResponse> {
  return this.http.post<LikeResponse>(`${this.base}/quests/${id}/like`, {});
}

unlikeQuest(id: number): Observable<LikeResponse> {
  return this.http.delete<LikeResponse>(`${this.base}/quests/${id}/like`);
}

// LoreService
likeLore(id: number): Observable<LikeResponse> {
  return this.http.post<LikeResponse>(`${this.base}/lore/${id}/like`, {});
}

unlikeLore(id: number): Observable<LikeResponse> {
  return this.http.delete<LikeResponse>(`${this.base}/lore/${id}/like`);
}
```

---

## Sugestão de UX para o botão de like

```typescript
// No componente, ao clicar no botão:
toggleLike(quest: QuestGuide) {
  if (!this.authService.isLoggedIn()) {
    // redirecionar para login ou abrir modal
    return;
  }

  const action$ = quest.userHasLiked
    ? this.questService.unlikeQuest(quest.id)
    : this.questService.likeQuest(quest.id);

  action$.subscribe({
    next: (res) => {
      quest.likeCount = res.likeCount;
      quest.userHasLiked = res.userHasLiked;
    },
    error: (err) => {
      if (err.status === 409) {
        // já curtiu — atualizar UI localmente se necessário
        quest.userHasLiked = true;
      }
    }
  });
}
```

---

## Resumo do que mudar no front

| O quê | Onde |
|-------|------|
| Adicionar `userHasLiked: boolean` na interface `QuestGuide` | `quest.model.ts` ou equivalente |
| Adicionar `userHasLiked: boolean` na interface `LoreArticle` | `lore.model.ts` ou equivalente |
| Adicionar `likeCount` e `userHasLiked` na interface `QuestGuideDetail` | `quest-detail.model.ts` |
| Adicionar `LikeResponse` interface | `like.model.ts` ou inline |
| Adicionar `likeQuest()` / `unlikeQuest()` | `quest.service.ts` |
| Adicionar `likeLore()` / `unlikeLore()` | `lore.service.ts` |
| Implementar botão de like nos cards de quest e lore | componentes de lista/detalhe |
