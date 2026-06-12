# Souls Guide — Handoff Back-end → Front-end

## Como rodar o back-end localmente

### Pré-requisitos
- Docker Desktop rodando
- IntelliJ com o projeto `soulsguide` aberto

### 1. Sobe a infra
```bash
cd Back-end/soulsguide
docker compose up -d postgres eureka-server config-server
```

### 2. Roda a API
No IntelliJ, na run configuration de `SoulsguideApplication`:
- **Active profiles**: `local`
- Roda normalmente

A API sobe em **http://localhost:8095**

Swagger disponível em: **http://localhost:8095/swagger-ui.html**

---

## Autenticação

Os endpoints de **escrita** (POST, PUT, DELETE) exigem JWT no header:

```
Authorization: Bearer <token>
```

Os endpoints de **leitura** (GET) são públicos — sem token.

O token deve ser gerado pelo `authorization-api` (já existente no projeto). O campo `userId` nos recursos de QuestGuide e LoreArticle é extraído automaticamente do token no back-end — o front não precisa enviar.

---

## Endpoints disponíveis

### Games — `/games`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/games` | ❌ | Lista todos (paginado) |
| GET | `/games/{id}` | ❌ | Busca por ID |
| POST | `/games` | ✅ | Cria game |
| PUT | `/games/{id}` | ✅ | Atualiza game |
| DELETE | `/games/{id}` | ✅ | Remove game |

**GET /games** — query params: `page`, `size`, `sort`

**POST/PUT /games** — body:
```json
{
  "name": "Elden Ring",
  "imageUrl": "https://...",
  "description": "..."
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Elden Ring",
  "imageUrl": "https://...",
  "description": "..."
}
```

---

### Quest Guides — `/quests`

Guias de quest colaborativos. Cada quest pertence a um game e a um usuário (extraído do token).

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/quests` | ❌ | Lista todos (paginado) |
| GET | `/quests/{id}` | ❌ | Busca por ID |
| POST | `/quests` | ✅ | Cria quest guide |
| PUT | `/quests/{id}` | ✅ | Atualiza quest guide |
| DELETE | `/quests/{id}` | ✅ | Remove quest guide |

**POST/PUT /quests** — body:
```json
{
  "title": "Questline da Ranni",
  "description": "Guia completo da questline da Ranni",
  "gameId": 1
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Questline da Ranni",
  "description": "Guia completo da questline da Ranni",
  "userId": "uuid-do-usuario",
  "gameId": 1,
  "gameName": "Elden Ring"
}
```

---

### Lore Articles — `/lore`

Artigos de lore escritos pela comunidade. Podem referenciar itens do game.

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/lore` | ❌ | Lista todos (paginado) |
| GET | `/lore/{id}` | ❌ | Busca por ID |
| POST | `/lore` | ✅ | Cria artigo |
| PUT | `/lore/{id}` | ✅ | Atualiza artigo |
| DELETE | `/lore/{id}` | ✅ | Remove artigo |

**Status possíveis:** `TEORIA`, `CONSOLIDADO`, `CANONICO`

**POST/PUT /lore** — body:
```json
{
  "title": "A Origem de Marika",
  "content": "Marika é...",
  "status": "TEORIA",
  "gameId": 1,
  "itemIds": [1, 2]
}
```

**Response:**
```json
{
  "id": 1,
  "title": "A Origem de Marika",
  "content": "Marika é...",
  "status": "TEORIA",
  "userId": "uuid-do-usuario",
  "gameId": 1,
  "gameName": "Elden Ring",
  "items": [
    { "id": 1, "name": "Espelho de Marika", "description": "..." }
  ]
}
```

---

## Paginação

Todos os GETs de lista retornam o formato padrão do Spring Page:

```json
{
  "content": [...],
  "pageable": { "pageNumber": 0, "pageSize": 20 },
  "totalElements": 42,
  "totalPages": 3,
  "last": false,
  "first": true
}
```

Parâmetros: `?page=0&size=20&sort=name,asc`

---

## O que ainda NÃO está implementado no back-end

- **QuestNode e QuestEdge** — os nós e arestas do grafo de uma quest (estrutura de passos). As entidades existem no banco mas os endpoints ainda não foram criados.
- **UserProgress** — progresso do usuário dentro de uma quest. Entidade existe, sem endpoints.
- **Items** — endpoint de CRUD de itens (existem apenas como relação dentro de LoreArticle).

Esses recursos são os próximos a serem desenvolvidos — mas o front pode começar com Games, Quests e Lore já.
