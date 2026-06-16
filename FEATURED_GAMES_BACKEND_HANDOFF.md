# Jogos em Destaque — Backend Handoff

> **Status: implementado.** O endpoint está disponível — é só trocar a chamada.

---

## O que foi feito

Criamos `GET /games/featured` que retorna os 6 jogos com mais conteúdo na plataforma (`questCount + loreCount` decrescente), sem precisar de token.

---

## Endpoint

```
GET http://localhost:8765/souls-guide-api/games/featured
Authorization: não requerida (público)

→ 200 OK
[
  { "id": 1, "name": "Elden Ring",  "shortName": "EL", "questCount": 12, "loreCount": 8 },
  { "id": 2, "name": "Bloodborne",  "shortName": "BL", "questCount": 7,  "loreCount": 5 },
  ...
]
```

- Retorna no máximo **6 itens**
- Ordenados por relevância (`questCount + loreCount` decrescente)
- `shortName` é gerado automaticamente (2 primeiras letras do nome em maiúsculo)

---

## Interface TypeScript

```typescript
// src/app/core/models/game.model.ts

export interface FeaturedGame {
  id: number;
  name: string;
  shortName: string;
  questCount: number;
  loreCount: number;
}
```

---

## O que mudar no GameService

Arquivo: `src/app/core/services/game.service.ts`

```typescript
// Remover (ou manter como fallback):
// this.http.get<...>(`${this.base}/games?size=5`)

// Adicionar:
getFeatured(): Observable<FeaturedGame[]> {
  return this.http.get<FeaturedGame[]>(`${this.base}/games/featured`);
}
```

---

## Resumo dos arquivos

| Ação | Arquivo |
|------|---------|
| Adicionar interface `FeaturedGame` | `src/app/core/models/game.model.ts` |
| Trocar chamada na home | `src/app/core/services/game.service.ts` — substituir `GET /games?size=5` por `GET /games/featured` |
