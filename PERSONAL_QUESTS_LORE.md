# SoulGuide — Spec Front-end: Quests e Lore de Perfil

---

## Visão geral

Dois tipos de conteúdo passam a existir no sistema:

| | Comunidade | Perfil |
|---|---|---|
| Quem edita | Todos | Só o dono |
| Onde aparece | `/games/:id` | `/perfil/:username` |
| Versionamento | ✓ | ✗ |
| Visibilidade | Sempre pública | `isPublic` controlado pelo dono |
| Like | ✗ | ✓ |
| Copiar para perfil | ✓ | ✓ (se `allowCopy: true`) |

---

## Modelos a criar/atualizar

### Atualizar `QuestSummary` e `QuestApi` em `quest.model.ts`

```typescript
// campos novos
isPersonal: boolean;
ownerId?: string;
ownerNickname?: string;
isPublic?: boolean;
allowCopy?: boolean;
likeCount?: number;
userHasLiked?: boolean;
```

### Atualizar `LoreSummary` e `LoreApi` em `lore-article.model.ts`

Mesmos campos acima.

### Novo modelo `PersonalContentSettings`

```typescript
export interface PersonalContentSettings {
  isPublic: boolean;
  allowCopy: boolean;
}
```

---

## Novos serviços

### `PersonalQuestService`

```typescript
// src/app/core/services/personal-quest.service.ts
createPersonal(data): POST /quests/personal
listByUser(userId): GET /users/{userId}/quests
updatePersonal(id, data): PUT /quests/personal/{id}
deletePersonal(id): DELETE /quests/personal/{id}
copyToProfile(questId, replaceExistingId?): POST /quests/{questId}/copy-to-profile
like(id): POST /quests/personal/{id}/like
unlike(id): DELETE /quests/personal/{id}/like
```

### `PersonalLoreService`

```typescript
// src/app/core/services/personal-lore.service.ts
createPersonal(data): POST /lore/personal
listByUser(userId): GET /users/{userId}/lore
updatePersonal(id, data): PUT /lore/personal/{id}
deletePersonal(id): DELETE /lore/personal/{id}
copyToProfile(loreId, filterType, replaceExistingId?): POST /lore/{loreId}/copy-to-profile
like(id): POST /lore/personal/{id}/like
unlike(id): DELETE /lore/personal/{id}/like
```

---

## Novas rotas

```
/perfil/:username                    — perfil público de um usuário
/perfil/:username/quests/:id         — quest de perfil (visualização)
/perfil/:username/lore/:id           — lore de perfil (visualização)
/perfil/quests/new                   — criar quest de perfil (authGuard)
/perfil/quests/:id/edit              — editar quest de perfil (authGuard + ownerGuard)
/perfil/lore/new                     — criar lore de perfil (authGuard)
/perfil/lore/:id/edit                — editar lore de perfil (authGuard + ownerGuard)
```

---

## Componentes a criar

### 1. `profile-public` — página de perfil público (`/perfil/:username`)

Seções:
- Avatar + nickname + bio (futuramente)
- Aba "quests" → lista as quests pessoais públicas do usuário
- Aba "lore" → lista os lores pessoais públicos do usuário
- Cada card mostra: título, jogo, like count, botão de like (se logado e não é o dono), botão "copiar para meu perfil" (se `allowCopy: true`)

### 2. `personal-quest-editor` — criar/editar quest de perfil

Baseado no `quest-editor` existente, com campos extras:
- Toggle "visível para a comunidade" (`isPublic`)
- Toggle "permitir cópia" (`allowCopy`)
- Sem aba de histórico de versões (não tem versionamento)

### 3. `personal-lore-editor` — criar/editar lore de perfil

Baseado no `lore-create` existente, com campos extras:
- Toggle `isPublic`
- Toggle `allowCopy`

### 4. `copy-to-profile-modal` — confirmação de cópia

Aparece quando:
- Usuário clica "copiar para meu perfil"
- Sistema detecta conflito (409 do back) — já tem quest/lore com mesmo título

Conteúdo do modal em caso de conflito:
```
"Você já tem uma quest com este nome no seu perfil.
 Deseja substituir pela versão da comunidade?"
[Cancelar]  [Substituir]
```

Para lore: exibir filtro de tipo antes de confirmar:
```
O que deseja copiar?
( ) Artigo completo
( ) Apenas lore de personagem
( ) Apenas lore do mundo
[Copiar]
```

### 5. `like-button` — componente compartilhado

```typescript
// src/app/shared/components/like-button/like-button.ts
@Input() count: number
@Input() liked: boolean
@Input() disabled: boolean  // true quando é o próprio dono
@Output() toggle = new EventEmitter<void>()
```

---

## Botão "copiar para meu perfil" — onde aparece

- Card de quest na listagem da comunidade (`/quests`)
- Página de detalhe da quest (`/games/:gameId/quests/:questId`)
- Card de lore na listagem (`/lore`)
- Página de detalhe do lore (`/lore/:id`)

Só aparece quando:
- Usuário está logado
- `allowCopy: true` no item
- Usuário não é o dono (para perfil alheio)

---

## Fluxo de cópia

```
usuário clica "copiar para meu perfil"
  ↓
POST /quests/{id}/copy-to-profile
  ↓ 201 → toast "Quest copiada para o seu perfil!"
  ↓ 409 → abre modal de confirmação com replaceExistingId
            ↓ confirma → POST com { replaceExistingId }
                          ↓ 201 → toast "Quest substituída com sucesso!"
```

---

## Seção "meu conteúdo" no perfil próprio (`/perfil`)

Na página `/perfil` (já existente), adicionar seção abaixo das informações pessoais:

- Aba "minhas quests" → lista quests com `isPersonal: true` do usuário logado (incluindo privadas)
- Aba "meu lore" → lista lores pessoais
- Botão "nova quest" → `/perfil/quests/new`
- Botão "novo lore" → `/perfil/lore/new`
- Cada card: título, jogo, ícone de visibilidade (🔒 privado / 🌐 público), like count, botões editar/deletar

---

## Checklist front-end

### Modelos
- [ ] Adicionar campos pessoais em `QuestSummary`, `QuestApi`
- [ ] Adicionar campos pessoais em `LoreSummary`, `LoreApi`

### Serviços
- [ ] `PersonalQuestService`
- [ ] `PersonalLoreService`

### Componentes
- [ ] `profile-public` (`/perfil/:username`)
- [ ] `personal-quest-editor` (`/perfil/quests/new` e `/perfil/quests/:id/edit`)
- [ ] `personal-lore-editor` (`/perfil/lore/new` e `/perfil/lore/:id/edit`)
- [ ] `copy-to-profile-modal`
- [ ] `like-button` (shared)

### Integração
- [ ] Botão "copiar" em `quest-detail.html`
- [ ] Botão "copiar" em `quests.html` (card da lista)
- [ ] Botão "copiar" em `lore-detail`
- [ ] Botão "copiar" em listagem de lore
- [ ] Seção "meu conteúdo" na página `/perfil` existente
- [ ] Rotas novas em `app.routes.ts`
