# Activity Feed Fix — `followed_user` agora retorna `@nickname`

## O que foi corrigido no back-end

O endpoint `GET /users/{userId}/activity` retornava o **ID numérico** do usuário seguido no campo `targetTitle` para eventos do tipo `followed_user`.

Agora retorna o handle prefixado com `@` (ex: `@vincruz`).

## Formato atual da resposta

```json
{
  "type": "followed_user",
  "targetId": "42",
  "targetKind": "user",
  "targetTitle": "@vincruz",
  "createdAt": "2025-06-16T14:30:00Z"
}
```

## O que o front precisa fazer

### 1. Atualizar o texto do evento `followed_user`

Onde você renderiza a linha do activity feed, troque qualquer formatação que usava `targetId` para exibir o nome — agora `targetTitle` já vem pronto com o `@`.

**Antes (provavelmente):**
```ts
case 'followed_user':
  return `Você seguiu o usuário ${event.targetId}`;
```

**Depois:**
```ts
case 'followed_user':
  return `Você seguiu ${event.targetTitle}`; // ex: "Você seguiu @vincruz"
```

### 2. Link para o perfil

O `targetId` continua sendo o ID numérico do usuário. Use-o para construir o link de perfil se necessário:

```ts
// Se você tem uma rota de perfil por ID:
routerLink: `/users/${event.targetId}`

// Se você tem uma rota de perfil por handle (remove o @):
const handle = event.targetTitle.replace('@', '');
routerLink: `/u/${handle}`
```

### 3. Eventos históricos

Eventos de follow registrados **antes** dessa correção ainda têm o ID numérico no `targetTitle`. Se quiser tratá-los graciosamente:

```ts
const displayName = event.targetTitle?.startsWith('@')
  ? event.targetTitle
  : `usuário #${event.targetId}`;
```

---

## Nenhuma mudança de contrato

- URL, método HTTP e estrutura da resposta são idênticos.
- Só o valor de `targetTitle` em eventos `followed_user` mudou.
- Eventos `created` e `updated` (quests/lores) não foram alterados.
