# SoulGuide — Handoff Back-end → Front-end: Histórico de Versões de Quests

> **Status:** Back-end implementado. Front-end aplicou os ajustes descritos neste documento.

---

## O que o front-end já tinha (e continua igual)

- `src/app/core/services/quest-version.service.ts` — 4 endpoints
- `src/app/features/quest-history/` — componente completo (ts, html, scss, mocks)
- Rota: `games/:gameId/quests/:questId/history`
- Lógica de sinais, `computed`, `toggleVote`, `revert` — correta, sem mudanças

---

## Ajustes aplicados pelo front-end

### 1. Tipos corrigidos em `quest-version.service.ts`

`revertedBy` era `VersionAuthor` (objeto), agora é `string | null` conforme o back retorna.
`diff` deixou de ser opcional — sempre vem no response, campos internos podem ser `null`.
`revertReason` era `'manual' | 'votes'` — removido `'manual'`, só existe `'votes' | null`.

```typescript
export interface VersionDiff {
  titleOld: string | null;
  titleNew: string | null;
  descriptionOld: string | null;
  descriptionNew: string | null;
  statusOld: string | null;
  statusNew: string | null;
  nodesAdded: number;
  nodesRemoved: number;
}

export interface QuestVersion {
  versionNumber: number;
  questId: number;
  editedBy: VersionAuthor;        // { userId: number; nickname: string }
  editedAt: string;               // ISO 8601
  status: 'current' | 'active' | 'reverted';
  diff: VersionDiff;              // sempre presente
  revertVotes: number;
  revertVotesNeeded: number;
  userHasVoted: boolean;
  revertedFromVersion: number | null;
  strikeIssued: boolean;
  revertedBy: string | null;      // ex: "sistema" ou username — NÃO é objeto
  revertReason: 'votes' | null;
}
```

### 2. Mock corrigido em `quest-history.mocks.ts`

```typescript
// antes
revertedBy: { userId: 0, nickname: 'sistema' }

// depois
revertedBy: 'sistema'
```

Todos os campos de `diff` agora têm valores explícitos (sem `undefined`).

### 3. Tratamento de erros HTTP por status em `quest-history.ts`

Antes havia um `.error()` genérico. Agora cada ação mapeia status codes:

| Ação | Status | Toast |
|------|--------|-------|
| `revert` | 400 | "Não é possível reverter para esta versão" |
| `revert` / `toggleVote` | 403 | "Você está temporariamente banido de editar quests" |
| `revert` / `toggleVote` | 404 | "Versão não encontrada" |
| `voteRevert` | 409 | "Você já votou nesta versão" |

### 4. Tratamento de 403 em `quest-editor.ts`

Quando `PUT /quests/{id}` retorna 403 (usuário banido):

```
"Você está temporariamente banido de fazer edições. Aguarde o período de ban expirar."
```

`alert()` substituído por `ToastService` em todos os casos de erro do editor.

---

## Shape completo do response — `GET /quests/{questId}/versions`

```json
[
  {
    "versionNumber": 4,
    "questId": 1,
    "editedBy": { "userId": 1, "nickname": "vincruz" },
    "editedAt": "2025-06-13T14:00:00Z",
    "status": "current",
    "diff": {
      "titleOld": null,
      "titleNew": null,
      "descriptionOld": "Execute o Plano da Lua.",
      "descriptionNew": "Execute o Plano da Lua e liberte os Sem Graça.",
      "statusOld": null,
      "statusNew": null,
      "nodesAdded": 3,
      "nodesRemoved": 0
    },
    "revertVotes": 2,
    "revertVotesNeeded": 5,
    "userHasVoted": false,
    "revertedFromVersion": null,
    "strikeIssued": false,
    "revertedBy": null,
    "revertReason": null
  },
  {
    "versionNumber": 2,
    "questId": 1,
    "editedBy": { "userId": 99, "nickname": "troll_xd" },
    "editedAt": "2025-06-11T10:00:00Z",
    "status": "reverted",
    "diff": {
      "titleOld": "Questline de Ranni, a Bruxa",
      "titleNew": "aaaaaaaaaa lixo",
      "descriptionOld": null,
      "descriptionNew": null,
      "statusOld": null,
      "statusNew": null,
      "nodesAdded": 0,
      "nodesRemoved": 8
    },
    "revertVotes": 7,
    "revertVotesNeeded": 5,
    "userHasVoted": false,
    "revertedFromVersion": null,
    "strikeIssued": true,
    "revertedBy": "sistema",
    "revertReason": "votes"
  }
]
```

---

## Endpoints confirmados

| Método | URL | Auth |
|--------|-----|------|
| `GET` | `/quests/{questId}/versions` | pública |
| `POST` | `/quests/{questId}/versions/{versionNumber}/revert` | obrigatória |
| `POST` | `/quests/{questId}/versions/current/vote-revert` | obrigatória |
| `DELETE` | `/quests/{questId}/versions/current/vote-revert` | obrigatória |

---

## O que NÃO mudou

- Os 4 métodos do `QuestVersionService` (URLs e verbos) — corretos
- A lógica do componente `quest-history` (sinais, computed, toggleVote, revert)
- A rota `games/:gameId/quests/:questId/history`
- A edição de quest (`quest-editor`) já dispara criação de versão automaticamente no back — nenhuma chamada extra necessária
