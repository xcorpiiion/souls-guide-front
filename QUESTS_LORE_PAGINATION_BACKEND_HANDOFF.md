# Quests e Lore — Paginação e Filtros · Backend Handoff

> **Status: implementado.** Ambos os endpoints aceitam paginação e filtros — é só trocar as chamadas.

---

## GET /quests

```
GET http://localhost:8765/souls-guide-api/quests?q=elden&gameId=1&status=TEORIA&page=0&size=10
Authorization: não requerida (público)
```

| Parâmetro | Tipo   | Default | Descrição |
|-----------|--------|---------|-----------|
| `q`       | string | `""`    | Busca parcial no título (case-insensitive) |
| `gameId`  | Long   | —       | Filtrar por jogo (opcional) |
| `status`  | string | —       | `TEORIA` \| `CONSOLIDADO` \| `CANONICO` (opcional) |
| `page`    | int    | `0`     | Índice da página (zero-based) |
| `size`    | int    | `10`    | Itens por página |

**Resposta — `200 OK` (Spring Page):**
```json
{
  "content": [ ...QuestGuideDTO[] ],
  "totalElements": 45,
  "totalPages": 5,
  "number": 0,
  "size": 10,
  "first": true,
  "last": false
}
```

---

## GET /lore

```
GET http://localhost:8765/souls-guide-api/lore?q=artorias&gameId=1&category=WORLD&page=0&size=12
Authorization: não requerida (público)
```

| Parâmetro  | Tipo   | Default | Descrição |
|------------|--------|---------|-----------|
| `q`        | string | `""`    | Busca parcial no título (case-insensitive) |
| `gameId`   | Long   | —       | Filtrar por jogo (opcional) |
| `category` | string | —       | `WORLD` \| `CHARACTER` (opcional) |
| `page`     | int    | `0`     | Índice da página (zero-based) |
| `size`     | int    | `12`    | Itens por página |

**Resposta — `200 OK` (Spring Page):**
```json
{
  "content": [ ...LoreArticleDTO[] ],
  "totalElements": 28,
  "totalPages": 3,
  "number": 0,
  "size": 12,
  "first": true,
  "last": false
}
```

> **Atenção:** o handoff anterior mencionava valores de `category` como `NPC`, `LOCACAO`, `ITEM`, etc. Os valores reais do enum são apenas `WORLD` e `CHARACTER`. Ajuste os filtros da UI de acordo.

---

## Regras comuns

- `q` vazio (`""`) → sem filtro de texto
- `gameId`, `status` e `category` não enviados → sem filtro por eles
- Ordenação: sempre por data de criação **decrescente** (mais recentes primeiro)
- `totalElements` e `totalPages` estão preenchidos — use para montar a paginação numerada

---

## Interfaces TypeScript (sem mudança estrutural)

Os campos retornados são os mesmos DTOs já existentes:

```typescript
// QuestGuideDTO — sem mudança
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
  likeCount: number;
}

// LoreArticleDTO — sem mudança
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
  likeCount: number;
}
```

---

## O que mudar nos services

```typescript
// QuestService
getQuests(params: { q?: string; gameId?: number; status?: string; page?: number; size?: number }) {
  return this.http.get<Page<QuestGuide>>(`${this.base}/quests`, { params });
}

// LoreService
getLore(params: { q?: string; gameId?: number; category?: string; page?: number; size?: number }) {
  return this.http.get<Page<LoreArticle>>(`${this.base}/lore`, { params });
}
```

---

## Resumo dos arquivos

| Ação | Arquivo |
|------|---------|
| Atualizar `getQuests()` com params | `src/app/core/services/quest.service.ts` |
| Atualizar `getLore()` com params | `src/app/core/services/lore.service.ts` |
| Trocar valores de `category` na UI | De `NPC`/`LOCACAO`/etc. para `WORLD` \| `CHARACTER` |
