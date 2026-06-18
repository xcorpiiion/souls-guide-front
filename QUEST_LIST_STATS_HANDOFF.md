# Quest List Stats — `stepCount`, `forkCount`, `endingCount`

## O que foi implementado

O endpoint `GET /quests` agora retorna três campos de contagem de nós diretamente no DTO de listagem. Não é mais necessário carregar `nodes[]` separadamente para exibir essas informações nos cards.

---

## Campos adicionados ao `QuestGuideDTO`

```json
{
  "id": 1,
  "title": "Missão do Anel",
  "status": "COMPLETO",
  "stepCount": 6,
  "forkCount": 2,
  "endingCount": 3,
  ...
}
```

| Campo | Tipo | O que conta |
|---|---|---|
| `stepCount` | `number` | Nós do tipo `TASK` (etapas da quest) |
| `forkCount` | `number` | Nós do tipo `GATEWAY` (bifurcações/decisões) |
| `endingCount` | `number` | Nós do tipo `END` (finais possíveis) |

---

## Como usar nos cards

```ts
// Exemplo de exibição no card de quest
`${quest.stepCount} etapas · ${quest.forkCount} bifurcações · ${quest.endingCount} finais`

// Ou com ícones:
// ✦ stepCount etapas
// ⑂ forkCount bifurcações
// ◎ endingCount finais
```

---

## Observações

- Esses campos são `0` quando a quest não tem nós cadastrados ainda.
- O `GET /quests/{id}` (detalhe) continua retornando `nodes[]` completo — use-o quando precisar do grafo inteiro.
- Os outros endpoints que retornam `QuestGuideDTO` (liked, following, by-user) retornam `0` nesses campos por ora — se precisar dos contadores neles também, é só avisar.
