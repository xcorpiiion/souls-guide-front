# SoulGuide — Handoff Back-end → Front-end

O que foi implementado no back-end e o que o front-end precisa ajustar para consumir.

---

## O que está pronto no back-end

Todas as 5 prioridades do `FRONTEND.md` foram implementadas:

- ✅ Banco populado com seed data (Elden Ring, Bloodborne, Dark Souls III + quests + nodes + lore)
- ✅ Campo `status` em `QuestGuide`
- ✅ `GET /quests/{id}` retorna nodes e edges embutidos
- ✅ Endpoints de gerenciamento de nodes e edges
- ✅ Campo `relatedQuests` em `GET /quests/{id}`
- ✅ Endpoints de `UserProgress`

---

## 1. `GET /quests/{id}` — shape atualizado

O endpoint agora retorna `QuestGuideDetailDTO` em vez do `QuestApi` simples.

```json
{
  "id": 1,
  "title": "Questline de Ranni, a Bruxa",
  "description": "Execute o Plano da Lua e liberte os Sem Graça.",
  "status": "CANONICO",
  "userId": "system",
  "gameId": 1,
  "gameName": "Elden Ring",
  "nodes": [
    { "id": "1", "type": "start", "label": "início", "sublabel": null, "description": null, "location": null, "tags": [], "linkedQuestId": null, "linkedQuestName": null },
    { "id": "2", "type": "task",  "label": "Encontrar Ranni", "sublabel": "Torre de Ranni", "description": "Vá até a Torre de Ranni e suba até o topo.", "location": "Caria, Liurnia", "tags": ["NPC", "noite"], "linkedQuestId": null, "linkedQuestName": null },
    { "id": "3", "type": "gateway", "label": "Ajudou Blaidd?", "sublabel": null, "description": null, "location": null, "tags": [], "linkedQuestId": null, "linkedQuestName": null },
    { "id": "4", "type": "end", "label": "Final — Ordem da Lua", "sublabel": null, "description": null, "location": null, "tags": [], "linkedQuestId": null, "linkedQuestName": null }
  ],
  "edges": [
    { "id": 1, "from": "1", "to": "2", "label": null },
    { "id": 2, "from": "2", "to": "3", "label": null },
    { "id": 3, "from": "3", "to": "4", "label": "sim" }
  ],
  "relatedQuests": []
}
```

**O que muda no `quest.model.ts`:**

`QuestApi` precisa incluir todos os campos do detalhe:

```ts
export interface QuestApi {
  id: number;
  title: string;
  description: string;
  status: QuestStatus;       // ← agora vem da API
  userId: string;
  gameId: number;
  gameName: string;
  nodes: QuestNode[];        // ← agora vem da API (no GET /quests/{id})
  edges: QuestEdge[];        // ← agora vem da API (no GET /quests/{id})
  relatedQuests: QuestRelatedLink[];  // ← agora vem da API
}
```

**O que muda no `questApiToSummary`:**

O `status` agora vem da API, não é mais hardcoded `'TEORIA'`:

```ts
export function questApiToSummary(q: QuestApi): QuestSummary {
  return {
    id: String(q.id),
    title: q.title,
    description: q.description,
    gameId: String(q.gameId),
    gameName: q.gameName,
    stepCount: q.nodes?.filter(n => n.type === 'task').length ?? 0,
    forkCount: q.nodes?.filter(n => n.type === 'gateway').length ?? 0,
    endingCount: q.nodes?.filter(n => n.type === 'end').length ?? 0,
    status: q.status ?? 'TEORIA',   // ← usa o valor da API
    followers: 0,
    author: q.userId ?? null,
  };
}
```

**O que muda no `QuestDetail` (`quest-detail.ts`):**

O `GET /quests/{id}` agora retorna nodes e edges diretamente — não precisa de uma segunda chamada:

```ts
ngOnInit(): void {
  this.questService.get(this.questId).subscribe({
    next: (api) => {
      const summary = questApiToSummary(api);
      this.quest.set({
        ...summary,
        nodes: api.nodes ?? [],
        edges: api.edges ?? [],
        relatedQuests: api.relatedQuests ?? [],
      });
      this.loading.set(false);
    },
    error: () => {
      this.error.set('Quest não encontrada.');
      this.loading.set(false);
    },
  });
}
```

---

## 2. `GET /quests` — lista agora inclui `status`

```json
{
  "content": [
    {
      "id": 1,
      "title": "Questline de Ranni, a Bruxa",
      "description": "...",
      "status": "CANONICO",
      "userId": "system",
      "gameId": 1,
      "gameName": "Elden Ring"
    }
  ],
  "totalElements": 2,
  "totalPages": 1,
  "pageNumber": 0,
  "pageSize": 20,
  "last": true,
  "first": true
}
```

---

## 3. Tipos de nó

O campo `type` dos nodes vem em **lowercase com hífen**:

| Valor da API | Descrição |
|---|---|
| `start` | Nó inicial |
| `end` | Final da quest |
| `task` | Passo normal |
| `gateway` | Bifurcação |
| `external-quest` | Referência a outra quest |

Esses valores já batem com o `QuestNodeType` que o front definiu.

---

## 4. `relatedQuests`

Preenchido automaticamente a partir dos nodes do tipo `external-quest` (nodes que têm `linkedQuestId` preenchido). Shape:

```json
{
  "questId": 2,
  "questTitle": "Questline de Blaidd",
  "npcInitials": null,
  "crossingNodeLabel": "Encontrar Blaidd"
}
```

> `npcInitials` não existe no modelo do back-end ainda — vem `null`. O front deve tratar o `null`.

---

## 5. Endpoints de UserProgress (autenticado)

Todos os endpoints de progresso exigem **Bearer token** no header.

### `GET /progress/quests/{questId}`

Retorna ou cria o progresso do usuário autenticado na quest.

```json
{
  "questId": 1,
  "completedNodeIds": ["2", "3"],
  "totalNodes": 4,
  "completedNodes": 2
}
```

> `completedNodeIds` são strings com o mesmo valor do campo `id` dos nodes.

### `POST /progress/quests/{questId}/nodes/{nodeId}/complete`

Marca um nó como completo. Retorna o mesmo shape do GET.

### `DELETE /progress/quests/{questId}/nodes/{nodeId}/complete`

Desmarca um nó. Retorna o mesmo shape do GET.

**Sugestão de service Angular:**

```ts
// Em quest.service.ts ou em um novo progress.service.ts

getProgress(questId: string): Observable<UserProgress> {
  return this.http.get<UserProgress>(`${this.base}/progress/quests/${questId}`);
  // base = environment.apis.soulsGuide
}

completeNode(questId: string, nodeId: string): Observable<UserProgress> {
  return this.http.post<UserProgress>(
    `${this.base}/progress/quests/${questId}/nodes/${nodeId}/complete`, {}
  );
}

uncompleteNode(questId: string, nodeId: string): Observable<UserProgress> {
  return this.http.delete<UserProgress>(
    `${this.base}/progress/quests/${questId}/nodes/${nodeId}/complete`
  );
}
```

**Model Angular sugerido:**

```ts
export interface UserProgress {
  questId: number;
  completedNodeIds: string[];
  totalNodes: number;
  completedNodes: number;
}
```

---

## 6. Endpoints de gerenciamento (editor de quest)

Todos exigem **Bearer token**.

| Método | Rota | Body |
|---|---|---|
| `POST` | `/quests/{id}/nodes` | `QuestNodeRequest` |
| `PUT` | `/quests/{id}/nodes/{nodeId}` | `QuestNodeRequest` |
| `DELETE` | `/quests/{id}/nodes/{nodeId}` | — |
| `POST` | `/quests/{id}/edges` | `QuestEdgeRequest` |
| `DELETE` | `/quests/{id}/edges/{edgeId}` | — |

**`QuestNodeRequest`:**
```json
{
  "label": "Encontrar Ranni",
  "nodeType": "TASK",
  "sublabel": "Torre de Ranni",
  "description": "Vá até a Torre de Ranni.",
  "location": "Caria, Liurnia",
  "tags": ["NPC", "noite"],
  "linkedQuestId": null,
  "linkedQuestName": null
}
```

> `nodeType` no **request** vai em **UPPERCASE** (`START`, `END`, `TASK`, `GATEWAY`, `EXTERNAL_QUEST`).  
> `type` no **response** vem em **lowercase** (`start`, `end`, `task`, `gateway`, `external-quest`).

**`QuestEdgeRequest`:**
```json
{
  "sourceNodeId": 1,
  "targetNodeId": 2,
  "label": "sim"
}
```

---

## 7. Campo `status` no POST/PUT de quest

Ao criar ou editar uma quest, o campo `status` é opcional (default `TEORIA`):

```json
{
  "title": "Minha Quest",
  "description": "...",
  "gameId": 1,
  "status": "CONSOLIDADO"
}
```

---

## Checklist para o front-end

- [ ] Atualizar `QuestApi` para incluir `status`, `nodes`, `edges`, `relatedQuests`
- [ ] Atualizar `questApiToSummary` para usar `status` da API e calcular `stepCount`/`forkCount`/`endingCount` dos nodes
- [ ] Atualizar `QuestDetail.ngOnInit` para montar `nodes`, `edges` e `relatedQuests` a partir da resposta direta do `GET /quests/{id}`
- [ ] Criar `UserProgress` model e endpoints no service
- [ ] Tratar `npcInitials: null` no componente de quests relacionadas
- [ ] Para o editor: enviar `nodeType` em UPPERCASE no request, receber `type` em lowercase no response
