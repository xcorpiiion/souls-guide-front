# Personal Lore — Copy, Load & Edit

## Contexto

Lores pessoais funcionam igual às quests pessoais: quando você copia uma lore da comunidade, o back-end cria uma **nova lore** com um **novo ID** no perfil do usuário. Todas as operações de edição usam esse novo ID.

---

## Endpoints

### 1. Carregar lore pessoal para o editor

```
GET /lore/personal/{id}
Authorization: Bearer <token>
```

Retorna `LoreArticleDTO` completo com o conteúdo da lore.

Erros:
- `403` — não é o dono
- `404` — lore não encontrada

---

### 2. Salvar alterações da lore pessoal

```
PUT /lore/personal/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Novo título",
  "content": "Novo conteúdo",
  "type": "WORLD",
  "characterName": null,
  "tags": ["tag1", "tag2"],
  "isPublic": true,
  "allowCopy": true
}
```

Retorna `LoreArticleDTO` atualizado.

Erros:
- `403` — não é o dono
- `404` — lore não encontrada

---

### 3. Copiar lore da comunidade → perfil do usuário

```
POST /lore/{communityLoreId}/copy-to-profile
Authorization: Bearer <token>
Content-Type: application/json

{}
```

**Resposta 201 — sucesso:**

```json
{
  "id": 55,
  "title": "A Lenda de Ranni",
  "content": "...",
  "isPersonal": true,
  "ownerId": "42",
  ...
}
```

> **IMPORTANTE:** use o `id: 55` da resposta para todas as chamadas seguintes. Nunca reutilize o `communityLoreId` da URL.

**Resposta 409 — já existe uma cópia com mesmo título:**

```json
{
  "message": "Você já possui uma cópia deste artigo no seu perfil",
  "conflictingId": 33,
  "conflictingTitle": "A Lenda de Ranni"
}
```

Exiba um diálogo: "Você já tem esta lore. Deseja substituir?" Se confirmar, reenvie com:

```json
{ "filterType": "all", "replaceExistingId": 33 }
```

> **Regra:** `replaceExistingId` deve ser sempre o `conflictingId` do 409 — nunca o ID da lore da comunidade.

---

### 4. Deletar lore pessoal

```
DELETE /lore/personal/{id}
Authorization: Bearer <token>
```

Retorna `204 No Content`.

---

### 5. Listar lores pessoais de um usuário

```
GET /lore/by-user/{userId}
```

- **Dono do perfil** (token do próprio usuário) → retorna todas (públicas + privadas)
- **Outro usuário / sem token** → retorna só as públicas (`isPublic: true`)

> Este endpoint agora retorna **apenas lores pessoais** (`isPersonal: true`). Lores da comunidade ficam em `GET /lore`.

---

## Fluxo correto

```
1. Usuário clica "Copiar para meu perfil" em uma lore da comunidade (id: 10)
   → POST /lore/10/copy-to-profile
   ← { id: 55, isPersonal: true, ... }

2. Salvar id: 55 no estado

3. Usuário abre o editor
   → GET /lore/personal/55
   ← { id: 55, title: "...", content: "..." }

4. Usuário edita e salva
   → PUT /lore/personal/55  { title, content, isPublic, allowCopy, ... }
   ← { id: 55, ... }

5. Nunca usar id: 10 para editar
```

---

## Diferença entre lore da comunidade e lore pessoal

| | Lore da Comunidade | Lore Pessoal |
|---|---|---|
| `isPersonal` | `false` | `true` |
| `ownerId` | `null` | ID do usuário |
| Edição | `PUT /lore/{id}` | `PUT /lore/personal/{id}` |
| Aparece em `GET /lore` | ✓ | ✗ |
| Aparece em `GET /lore/by-user/{id}` | ✗ | ✓ |
| Tem versões/histórico | ✓ | ✗ |
