# Copy Quest — Conflito e Substituição

## Contexto

Quests da comunidade e quests pessoais são coisas diferentes no back-end, mesmo que pareçam iguais visualmente:

| | Quest da Comunidade | Quest Pessoal |
|---|---|---|
| `isPersonal` | `false` | `true` |
| `ownerId` | `null` | ID do usuário |
| Endpoint de edição | `PUT /quests/{id}` | `PUT /quests/personal/{id}` |
| Aparece em `/quests` | ✓ | ✗ |
| Aparece em `/quests/by-user/{id}` | ✗ | ✓ |

---

## Fluxo de cópia com conflito

### 1. Usuário clica "Copiar para meu perfil"

```
POST /quests/{communityQuestId}/copy-to-profile
Body: {}
```

### 2a. Sem conflito → 201

A quest pessoal foi criada. Use o `id` da resposta daqui pra frente.

```json
{ "id": 99, "title": "Missão do Anel", "isOwner": true, ... }
```

### 2b. Com conflito → 409

O usuário já tem uma quest **pessoal** com mesmo título e jogo.

```json
{
  "message": "Você já possui uma cópia desta quest no seu perfil",
  "conflictingId": 77,
  "conflictingTitle": "Missão do Anel"
}
```

Exiba um diálogo:
> "Você já tem '**Missão do Anel**' no seu perfil. Deseja substituir?"

### 3. Usuário confirma substituição

Reenvie a requisição passando o `conflictingId` no body:

```
POST /quests/{communityQuestId}/copy-to-profile
Body: { "replaceExistingId": 77 }
```

O back-end vai:
1. Soft-deletar a quest pessoal `id=77` (e seus nodes/edges)
2. Criar uma nova cópia com um novo ID
3. Retornar 201 com a nova quest

---

## Regra crítica

> **O `replaceExistingId` deve sempre vir do `conflictingId` retornado pelo 409.**

Nunca passe o ID da quest da comunidade (o que está na URL) como `replaceExistingId`. O back-end vai ignorar silenciosamente se o ID não for de uma quest pessoal do usuário, e a cópia vai ser criada duplicada.

```ts
// ✅ Correto
const body = { replaceExistingId: conflictResponse.conflictingId };

// ❌ Errado — nunca faça isso
const body = { replaceExistingId: communityQuestId };
```

---

## Após a cópia

Use sempre o `id` retornado na resposta 201 para navegar para o editor:

```ts
const copy = await copyToProfile(communityQuestId, replaceExistingId);
router.navigate(['/editor/personal', copy.id]);
//                                          ↑ novo ID gerado pelo back
```
