# Personal Quest — Copy, Load & Edit

## Contexto

Quando o usuário copia uma quest da comunidade, o back-end cria uma **nova quest** com um **novo ID** vinculada ao perfil do usuário. Todas as operações de edição devem usar esse novo ID, nunca o ID da quest original da comunidade.

---

## Endpoints

### 1. Copiar quest da comunidade → perfil do usuário

```
POST /quests/{communityQuestId}/copy-to-profile
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Resposta 201 — sucesso:**

```json
{
  "id": 99,
  "title": "Missão do Anel",
  "description": "...",
  "status": "TEORIA",
  "userId": "42",
  "gameId": 3,
  "gameName": "Elden Ring",
  "nodes": [...],
  "edges": [...],
  "relatedQuests": [],
  "likeCount": 0,
  "userHasLiked": false,
  "followerCount": 0,
  "userIsFollowing": false,
  "isOwner": true,
  "hidden": false,
  "hiddenReason": null,
  "hiddenIsSpoiler": false
}
```

> **IMPORTANTE:** o `id: 99` na resposta é o ID da quest do usuário — use ele para todas as chamadas seguintes. Não reutilize o `communityQuestId` da URL.

**Resposta 409 — já existe uma cópia com mesmo título:**

```json
{
  "message": "Você já possui uma cópia desta quest no seu perfil",
  "conflictingId": 77,
  "conflictingTitle": "Missão do Anel"
}
```

Nesse caso, exiba um diálogo: "Você já tem esta quest. Deseja substituir?" Se o usuário confirmar, reenvie com:

```json
{ "replaceExistingId": 77 }
```

---

### 2. Carregar quest do usuário para o editor

```
GET /quests/personal/{personalQuestId}
Authorization: Bearer <token>
```

Retorna o mesmo formato do 201 acima — com `nodes[]` e `edges[]` prontos para montar o grafo no editor.

Erros:
- `403` — não é o dono
- `404` — quest não encontrada

---

### 3. Salvar alterações da quest do usuário

```
PUT /quests/personal/{personalQuestId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Novo título",
  "description": "Nova descrição",
  "isPublic": true,
  "allowCopy": true
}
```

Retorna o mesmo formato com nodes/edges atualizados.

> Nodes e edges são salvos separadamente via sync de nodes/edges — o PUT atualiza apenas os metadados da quest.

Erros:
- `403` — não é o dono
- `404` — quest não encontrada

---

### 4. Deletar quest do usuário

```
DELETE /quests/personal/{personalQuestId}
Authorization: Bearer <token>
```

Retorna `204 No Content`.

---

## Fluxo correto no front

```
1. Usuário clica "Copiar para meu perfil" em uma quest da comunidade (id: 10)
   → POST /quests/10/copy-to-profile
   ← { id: 99, nodes: [...], edges: [...], isOwner: true, ... }

2. Salvar o id: 99 no estado — esse é o ID da quest pessoal

3. Usuário abre o editor da quest pessoal
   → GET /quests/personal/99
   ← { id: 99, nodes: [...], edges: [...] }

4. Usuário edita e salva
   → PUT /quests/personal/99  { title, description, isPublic, allowCopy }
   ← { id: 99, nodes: [...], edges: [...] }

5. Nunca usar o id: 10 (comunidade) para editar — ele é somente leitura
```

---

## Campos de controle da quest pessoal

| Campo | Tipo | Descrição |
|---|---|---|
| `isPublic` | boolean | Se outros usuários podem ver esta quest no perfil |
| `allowCopy` | boolean | Se outros usuários podem copiar esta quest para o perfil deles |

Ambos podem ser alterados a qualquer momento via `PUT /quests/personal/{id}`.
