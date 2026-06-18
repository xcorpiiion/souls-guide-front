# Game Follow — Backend Handoff

## O que foi implementado

Follow/unfollow de jogos do zero. Reutiliza a tabela `content_follows` existente — nenhuma migration nova necessária.

---

## Endpoints

### `POST /games/{id}/follow`
Seguir um jogo. Exige autenticação.

- **Response `200`** — seguiu com sucesso
- **Response `409`** — já estava seguindo
- **Response `404`** — jogo não existe

---

### `DELETE /games/{id}/follow`
Deixar de seguir um jogo. Exige autenticação.

- **Response `200`** — operação realizada (idempotente — não dá erro se já não seguia)

---

## Mudanças no `GET /games`

O endpoint de listagem de jogos **agora retorna dois campos novos** no `GameSummaryDTO`:

| Campo | Tipo | Descrição |
|---|---|---|
| `followersCount` | `number` | Total real de seguidores do jogo (antes estava sempre `0`) |
| `userIsFollowing` | `boolean` | Se o usuário autenticado segue este jogo. Será `false` para usuários anônimos |

**Exemplo de response atualizado:**
```json
{
  "id": 1,
  "name": "Elden Ring",
  "shortName": "EL",
  "accentClass": "",
  "questCount": 42,
  "loreCount": 18,
  "followersCount": 231,
  "contributorsCount": 15,
  "topQuestTitle": "Como derrotar Malenia",
  "topQuestSteps": 7,
  "topQuestFollowers": 38,
  "lastActivityLabel": "hoje",
  "userIsFollowing": true
}
```

---

## O que o front precisa fazer

### 1. Atualizar a interface `GameSummaryDTO` / model

Adicionar os dois campos novos:
```ts
followersCount: number;
userIsFollowing: boolean;
```

### 2. `GameService` — adicionar métodos

```ts
followGame(gameId: number): Observable<void>
unfollowGame(gameId: number): Observable<void>
```

Chamam `POST /games/{id}/follow` e `DELETE /games/{id}/follow` respectivamente.

### 3. Botão de follow na listagem e no detalhe do jogo

- Exibir o botão apenas para usuários autenticados
- Estado inicial vem do campo `userIsFollowing` da resposta
- Ao clicar em "Seguir" → chama `followGame`, atualiza o estado localmente
- Ao clicar em "Deixar de seguir" → chama `unfollowGame`, atualiza o estado localmente
- Mostrar `followersCount` ao lado do botão

### 4. Feedback visual de loading

Desabilitar o botão enquanto a requisição está em andamento para evitar duplo clique.

---

## Fluxo do botão

```
userIsFollowing = false
    ↓ usuário clica "Seguir"
POST /games/{id}/follow
    ↓ sucesso
userIsFollowing = true  |  followersCount + 1

userIsFollowing = true
    ↓ usuário clica "Deixar de seguir"
DELETE /games/{id}/follow
    ↓ sucesso
userIsFollowing = false  |  followersCount - 1
```
