# Games — Paginação e Busca por Nome · Backend Handoff

## Contexto

A tela `/games` agora exibe paginação numerada (12 jogos por página) e input de busca.
O front já está pronto e esperando o backend suportar esses parâmetros.
Sem isso, o endpoint traz **todos** os jogos de uma vez, o que vai explodir conforme a base crescer.

---

## O que o front envia

```
GET /games?page=0&size=12&name=elden
```

| Parâmetro | Tipo    | Obrigatório | Descrição                                          |
|-----------|---------|-------------|----------------------------------------------------|
| `page`    | int     | não (default 0)  | Índice da página (zero-based)                 |
| `size`    | int     | não (default 12) | Itens por página                              |
| `name`    | string  | não          | Filtro parcial, case-insensitive (ILIKE `%name%`) |

---

## O que o front espera receber

Formato **Spring Page** padrão:

```json
{
  "content": [ ...GameSummary[] ],
  "totalElements": 87,
  "totalPages": 8,
  "number": 0,
  "size": 12,
  "first": true,
  "last": false
}
```

Os campos `totalElements` e `totalPages` são obrigatórios — o front usa os dois para montar a paginação.

---

## Interface de cada item (`GameSummary`)

Já utilizada pelo front (não muda):

```typescript
export interface GameSummary {
  id: string;
  name: string;
  shortName: string;
  accentClass: string;
  questCount: number;
  loreCount: number;
  followersCount: number;
  contributorsCount: number;
  topQuestTitle: string | null;
  topQuestSteps: number | null;
  topQuestFollowers: number | null;
  lastActivityLabel: string;
}
```

---

## Implementação sugerida (Spring Data JPA)

### Repository

```java
@Query("""
    SELECT g FROM Game g
    WHERE (:name IS NULL OR LOWER(g.name) LIKE LOWER(CONCAT('%', :name, '%')))
    ORDER BY g.name ASC
    """)
Page<Game> findByNameContaining(@Param("name") String name, Pageable pageable);
```

### Controller

```java
@GetMapping
public ResponseEntity<Page<GameSummaryDto>> list(
    @RequestParam(defaultValue = "") String name,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "12") int size
) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
    String nameFilter = name.isBlank() ? null : name;
    return ResponseEntity.ok(gameService.list(nameFilter, pageable));
}
```

> **Importante:** quando `name` vier vazio (`""`), tratar como `null` para não executar filtro desnecessário.

---

## Endpoint de destaque (já implementado)

`GET /games/featured` continua existindo separadamente para a home page.
Este handoff é **só** para o `GET /games` com paginação.

---

## Resumo dos arquivos a alterar

| Ação | Arquivo |
|------|---------|
| Adicionar filtro `name` e `Pageable` | `GamesController.java` |
| Criar query com filtro ILIKE | `GameRepository.java` |
| Garantir retorno `Page<GameSummaryDto>` com `totalElements` e `totalPages` | `GameService.java` |
