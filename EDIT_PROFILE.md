# SoulGuide — Handoff Back-end → Front-end: Editar Perfil

---

## O que foi implementado

- ✅ Novos campos no usuário: `bio`, `location`, `website`, `profilePictureUrl`
- ✅ `PUT /users/{id}/profile` — atualiza informações pessoais
- ✅ `PUT /users/{id}/password` — altera senha com validação da senha atual

---

## Novos campos no usuário

O `GET /users/email/{email}` e qualquer endpoint que retorne o usuário agora incluem:

```json
{
  "id": 1,
  "name": "Vinicius Cruz",
  "nickname": "vincruz",
  "email": "vinicius@email.com",
  "bio": "Apaixonado por Elden Ring e Dark Souls.",
  "location": "Curitiba, PR",
  "website": "https://meusite.com",
  "profilePictureUrl": "https://storage.exemplo.com/foto.jpg",
  "imageId": null
}
```

Todos os campos novos podem vir `null` se o usuário nunca preencheu. Trate com fallback.

---

## 1. `PUT /users/{id}/profile` — Atualizar informações pessoais

**Rota:** `PUT /users/{id}/profile`  
**Autenticação:** Bearer token  
**Content-Type:** `application/json`

### Request body

```json
{
  "name": "Vinicius Cruz",
  "nickname": "vincruz",
  "bio": "Apaixonado por Elden Ring e Dark Souls.",
  "location": "Curitiba, PR",
  "website": "https://meusite.com",
  "profilePictureUrl": "https://storage.exemplo.com/foto.jpg"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | ✅ | Nome completo |
| `nickname` | string | ✅ | Nickname / @usuario |
| `bio` | string | ❌ | Texto livre de apresentação |
| `location` | string | ❌ | Ex: "Curitiba, PR" |
| `website` | string | ❌ | URL do site pessoal |
| `profilePictureUrl` | string | ❌ | URL da foto de perfil. Se omitido ou `null`, a foto atual é mantida |

### Response — `200 OK`

Retorna o usuário atualizado com o mesmo shape do campo acima.

### Erros possíveis

| Status | Motivo |
|---|---|
| `400` | `name` ou `nickname` vazios |
| `404` | Usuário com o `{id}` não encontrado |

---

## 2. `PUT /users/{id}/password` — Alterar senha

**Rota:** `PUT /users/{id}/password`  
**Autenticação:** Bearer token  
**Content-Type:** `application/json`

> A confirmação de senha ("repita a senha") é responsabilidade do front-end. O back-end recebe apenas a senha atual e a nova.

### Request body

```json
{
  "currentPassword": "minhasenhaatual",
  "newPassword": "minhanovasenha123"
}
```

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `currentPassword` | string | ✅ | Senha atual do usuário |
| `newPassword` | string | ✅ | Mínimo 6 caracteres |

### Response — `204 No Content`

Sem body. Sucesso silencioso.

### Erros possíveis

| Status | Motivo |
|---|---|
| `400` | Senha atual incorreta |
| `400` | `newPassword` com menos de 6 caracteres |
| `404` | Usuário não encontrado ou sem credenciais (ex: login Google sem senha definida) |

> **Atenção:** Usuários que fizeram login pelo Google não possuem senha cadastrada. O back-end retornará `404` para eles. O front já mostra a mensagem "Usuários com login Google não precisam definir senha" — não chame o endpoint de senha para esses usuários.

---

## Models Angular sugeridos

```ts
export interface UpdateProfileRequest {
  name: string;
  nickname: string;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  profilePictureUrl?: string | null;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
```

---

## Service Angular sugerido

```ts
// Em user.service.ts

updateProfile(userId: number, body: UpdateProfileRequest): Observable<UserApi> {
  return this.http.put<UserApi>(`${this.base}/users/${userId}/profile`, body);
}

updatePassword(userId: number, body: UpdatePasswordRequest): Observable<void> {
  return this.http.put<void>(`${this.base}/users/${userId}/password`, body);
}
```

---

## Checklist para o front-end

- [ ] Atualizar o model `UserApi` para incluir `bio`, `location`, `website`, `profilePictureUrl` (todos opcionais / nullable)
- [ ] No formulário de perfil: ao salvar, chamar `PUT /users/{id}/profile` com os campos do formulário
- [ ] `profilePictureUrl`: se o campo de foto não mudou, enviar o valor atual ou `null` (o back mantém a foto existente quando recebe `null`)
- [ ] Na seção de alterar senha: validar no front que "nova senha" === "confirmar nova senha" antes de chamar a API
- [ ] Não exibir / não habilitar o formulário de senha para usuários com `authProvider === 'GOOGLE'`
- [ ] Tratar o `204 No Content` do endpoint de senha (sem body para fazer parse)
- [ ] Exibir mensagem amigável para o `400` de "Senha atual incorreta"
