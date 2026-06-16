# SoulGuide — Handoff Back-end → Front-end: Criação e Histórico de Versões de Lore

> **Status:** Back-end implementado e testado (88 testes passando). Tudo pronto para integração.

---

## O que foi implementado

### Endpoints de artigo (existentes, agora com campos novos)

| Método | URL | Auth | Status |
|--------|-----|------|--------|
| `POST` | `/lore` | obrigatória | `201 Created` |
| `PUT` | `/lore/{id}` | obrigatória | `200 OK` |
| `GET` | `/lore` | pública | `200 OK` |
| `GET` | `/lore/{id}` | pública | `200 OK` |
| `DELETE` | `/lore/{id}` | obrigatória | `204 No Content` |

`POST` e `PUT` agora criam versão automaticamente — o front não precisa fazer nenhuma chamada extra.

### Endpoints de versão (novos)

| Método | URL | Auth | Status de sucesso |
|--------|-----|------|-------------------|
| `GET` | `/lore/{loreId}/versions` | pública | `200 OK` |
| `POST` | `/lore/{loreId}/versions/{n}/revert` | obrigatória | `201 Created` |
| `POST` | `/lore/{loreId}/versions/current/vote-revert` | obrigatória | `200 OK` |
| `DELETE` | `/lore/{loreId}/versions/current/vote-revert` | obrigatória | `200 OK` |

---

## Request — `POST /lore` e `PUT /lore/{id}`

```json
{
  "title": "A Ordem dos Sem Graça e o Plano da Lua",
  "content": "## A Ordem dos Sem Graça\n\nOs **Sem Graça** são...",
  "type": "WORLD",
  "gameId": 1,
  "characterName": null,
  "tags": ["facção", "Ranni", "lua"],
  "itemIds": []
}
```

> **Atenção:** `type` deve ser enviado em **maiúsculo** — `"WORLD"` ou `"CHARACTER"` (é um enum Java).
> O front estava enviando `"world"` / `"character"` em minúsculo — ajustar para maiúsculo.

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| `title` | `string` | sim | |
| `content` | `string` | sim | mín. 10 chars |
| `type` | `"WORLD" \| "CHARACTER"` | sim | maiúsculo |
| `gameId` | `number` | sim | |
| `characterName` | `string \| null` | obrigatório quando `type = "CHARACTER"` | |
| `tags` | `string[]` | não | máx. 5, salvas em lowercase |
| `itemIds` | `number[]` | não | pode enviar `[]` ou omitir |

---

## Response — `LoreArticle`

```json
{
  "id": 42,
  "title": "A Ordem dos Sem Graça e o Plano da Lua",
  "content": "## A Ordem dos Sem Graça\n\nOs **Sem Graça** são...",
  "status": "TEORIA",
  "type": "WORLD",
  "characterName": null,
  "tags": ["facção", "ranni", "lua"],
  "userId": "1",
  "gameId": 1,
  "gameName": "Elden Ring",
  "items": []
}
```

---

## Response — `GET /lore/{loreId}/versions`

Retorna lista ordenada da versão mais recente para a mais antiga.

```json
[
  {
    "versionNumber": 3,
    "loreId": 42,
    "editedBy": { "userId": 1, "nickname": "vincruz" },
    "editedAt": "2026-06-13T20:00:00Z",
    "status": "current",
    "diff": {
      "titleOld": null,
      "titleNew": null,
      "contentChanged": true,
      "contentPreviewOld": "primeiros 200 chars do conteúdo anterior...",
      "contentPreviewNew": "primeiros 200 chars do conteúdo novo..."
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
    "loreId": 42,
    "editedBy": { "userId": 99, "nickname": "troll_xd" },
    "editedAt": "2026-06-11T10:00:00Z",
    "status": "reverted",
    "diff": {
      "titleOld": "A Ordem dos Sem Graça",
      "titleNew": "lixo lixo lixo",
      "contentChanged": true,
      "contentPreviewOld": "Os Sem Graça são...",
      "contentPreviewNew": "asdfghjkl..."
    },
    "revertVotes": 7,
    "revertVotesNeeded": 5,
    "userHasVoted": false,
    "revertedFromVersion": null,
    "strikeIssued": true,
    "revertedBy": "sistema",
    "revertReason": "votes"
  },
  {
    "versionNumber": 1,
    "loreId": 42,
    "editedBy": { "userId": 1, "nickname": "vincruz" },
    "editedAt": "2026-06-10T09:00:00Z",
    "status": "active",
    "diff": {
      "titleOld": null,
      "titleNew": null,
      "contentChanged": false,
      "contentPreviewOld": null,
      "contentPreviewNew": null
    },
    "revertVotes": 0,
    "revertVotesNeeded": 5,
    "userHasVoted": false,
    "revertedFromVersion": null,
    "strikeIssued": false,
    "revertedBy": null,
    "revertReason": null
  }
]
```

### Interface TypeScript sugerida

```typescript
export interface LoreVersionDiff {
  titleOld: string | null;
  titleNew: string | null;
  contentChanged: boolean;
  contentPreviewOld: string | null;
  contentPreviewNew: string | null;
}

export interface VersionAuthor {
  userId: number;
  nickname: string;
}

export interface LoreVersion {
  versionNumber: number;
  loreId: number;
  editedBy: VersionAuthor;
  editedAt: string;               // ISO 8601
  status: 'current' | 'active' | 'reverted';
  diff: LoreVersionDiff;          // sempre presente
  revertVotes: number;
  revertVotesNeeded: number;      // sempre 5
  userHasVoted: boolean;
  revertedFromVersion: number | null;
  strikeIssued: boolean;
  revertedBy: string | null;      // ex: "sistema" ou nickname — é string, não objeto
  revertReason: 'votes' | null;
}
```

---

## Erros mapeados por endpoint

### `POST /lore` e `PUT /lore/{id}`

| Status | Motivo |
|--------|--------|
| `401` | Não autenticado |
| `403` | Usuário banido por strikes (ban ativo) |
| `400` | `type = CHARACTER` sem `characterName` |
| `422` | Campos obrigatórios ausentes/inválidos (Bean Validation) |

### `POST /lore/{id}/versions/{n}/revert`

| Status | Motivo |
|--------|--------|
| `400` | Tentou reverter para versão `current` ou `reverted` |
| `401` | Não autenticado |
| `403` | Usuário banido |
| `404` | Versão não encontrada |

### `POST /lore/{id}/versions/current/vote-revert`

| Status | Motivo |
|--------|--------|
| `401` | Não autenticado |
| `403` | Usuário banido |
| `409` | Usuário já votou nesta versão |

### `DELETE /lore/{id}/versions/current/vote-revert`

| Status | Motivo |
|--------|--------|
| `401` | Não autenticado |
| `404` | Usuário não tinha voto registrado |

---

## Regras de negócio (para exibição na UI)

- **Versão 1** (`versionNumber = 1`): não tem diff (todos os campos de `diff` são `null` / `false`)
- **5 votos** na versão `current` → reversão automática pelo sistema, `revertedBy = "sistema"`, `revertReason = "votes"`, autor recebe strike
- **Strikes acumulados por usuário** (entre quests e lore):
  - 3 strikes → ban 7 dias
  - 5 strikes → ban 30 dias
  - 7 strikes → ban permanente
- `status`:
  - `"current"` — versão ativa no momento
  - `"active"` — versão anterior, pode ser revertida manualmente
  - `"reverted"` — foi revertida, não pode ser alvo de revert
- `userHasVoted` só é `true` quando o usuário está logado e votou na versão `current`

---

## O que NÃO mudou

- URLs de `GET /lore` e `GET /lore/{id}` — mesmas
- Rota de criação de artigo no front (`/lore/new`) — sem mudança de fluxo
- Após `POST /lore` bem-sucedido: redirecionar para `/lore/{id}` (mesmo de antes)
- Após `PUT /lore/{id}` bem-sucedido: a versão é criada automaticamente no back — nenhuma chamada extra
