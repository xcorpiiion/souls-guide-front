# Quest Version Snapshot — `GET /quests/:id/versions/:versionNumber/snapshot`

## O que foi implementado no back-end

Novo endpoint que retorna o grafo completo (nodes + edges) de uma versão específica de uma quest, tal como estava **no momento em que a versão foi criada**.

> **Nota:** versões criadas **antes** dessa atualização terão `nodes: []` e `edges: []` — o snapshot histórico só existe a partir de agora.

---

## Endpoint

```
GET /quests/{questId}/versions/{versionNumber}/snapshot
```

- Público (não requer autenticação)
- `questId` — ID numérico da quest
- `versionNumber` — número da versão (ex: `1`, `2`, `3`)

---

## Resposta

```json
{
  "versionNumber": 3,
  "title": "Título da quest nessa versão",
  "description": "Descrição...",
  "status": "COMPLETO",
  "nodes": [
    {
      "id": "42",
      "type": "task",
      "label": "Falar com NPC",
      "sublabel": null,
      "description": "Conteúdo do nó",
      "location": "Limgrave",
      "tags": ["npc", "obrigatório"],
      "linkedQuestId": null,
      "linkedQuestName": null,
      "endingType": null
    }
  ],
  "edges": [
    {
      "id": 7,
      "from": "42",
      "to": "43",
      "label": "Condição opcional"
    }
  ]
}
```

### Campos de nodes

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | ID numérico do nó como string (compatível com React Flow / ngx-graph) |
| `type` | string | `"task"`, `"decision"`, `"end"`, `"start"` etc. |
| `label` | string | Título do nó |
| `sublabel` | string? | Subtítulo opcional |
| `description` | string? | Conteúdo descritivo |
| `location` | string? | Localização no jogo |
| `tags` | string[] | Tags |
| `linkedQuestId` | number? | ID de quest vinculada |
| `linkedQuestName` | string? | Nome da quest vinculada |
| `endingType` | string? | Tipo de final (`"good"`, `"bad"`, etc.) |

### Campos de edges

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | number | ID da aresta |
| `from` | string | ID do nó de origem |
| `to` | string | ID do nó de destino |
| `label` | string? | Condição/label da conexão |

---

## Como usar no front

### 1. Ao clicar em uma versão na lista

```ts
// Quando o usuário seleciona uma versão no histórico:
async loadVersionSnapshot(questId: number, versionNumber: number) {
  const snapshot = await this.questVersionService.getSnapshot(questId, versionNumber);
  this.previewNodes = snapshot.nodes;
  this.previewEdges = snapshot.edges;
  this.previewTitle = snapshot.title;
}
```

### 2. Versão atual vs histórica

A versão `CURRENT` também tem snapshot armazenado. Para a versão atual, você pode usar tanto esse endpoint quanto o `GET /quests/{id}` (que já retorna nodes e edges ao vivo).

Para versões antigas (`ACTIVE`, `REVERTED`), esse endpoint é a **única** forma de ver o grafo histórico.

### 3. Tratamento para versões sem snapshot

Versões antigas (antes do deploy dessa feature) terão `nodes: []` e `edges: []`. Exiba uma mensagem amigável:

```ts
if (snapshot.nodes.length === 0) {
  // "Snapshot histórico não disponível para esta versão."
}
```

---

## Erros possíveis

| Status | Situação |
|---|---|
| `404` | Quest ou número de versão não encontrado |
