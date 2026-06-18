# Notificações — Backend Handoff

## O que foi implementado no back-end

Sistema de notificações in-app com polling. Sem WebSocket, sem Firebase, sem custo extra de infra — tudo salvo no Postgres.

### Eventos que geram notificação automaticamente

| Evento | Tipo | Quem recebe |
|---|---|---|
| Alguém curtiu sua quest | `QUEST_LIKE` | Dono da quest |
| Alguém curtiu seu lore | `LORE_LIKE` | Dono do lore |
| Alguém comentou na sua quest | `COMMENT_ON_QUEST` | Dono da quest |
| Alguém comentou no seu lore | `COMMENT_ON_LORE` | Dono do lore |
| Alguém respondeu seu comentário | `REPLY_TO_COMMENT` | Autor do comentário pai |
| Uma quest que você segue teve nova versão | `QUEST_NEW_VERSION` | Todos os seguidores da quest |
| Alguém começou a te seguir | `USER_FOLLOW` | O usuário seguido |

> **Regra anti-spam:** ninguém recebe notificação de sua própria ação. Se você curtir sua própria quest, nada é disparado.

---

## Endpoints

Base path: `/notifications`  
Todos exigem `Authorization: Bearer <token>`.

### `GET /notifications?page=0`

Lista as notificações do usuário autenticado, paginadas (20 por página), da mais recente para a mais antiga.

**Response `200`:**
```json
[
  {
    "id": 42,
    "type": "QUEST_LIKE",
    "actorId": "123",
    "actorName": "lordofcinder99",
    "targetType": "QUEST",
    "targetId": 7,
    "targetTitle": "Como derrotar Malenia",
    "read": false,
    "createdAt": "2026-06-16T20:00:00"
  }
]
```

---

### `GET /notifications/unread-count`

Retorna apenas o número de notificações não lidas. Endpoint leve, feito para polling frequente.

**Response `200`:**
```json
{ "count": 3 }
```

---

### `POST /notifications/read-all`

Marca todas as notificações do usuário como lidas.

**Response `204 No Content`**

---

## Valores possíveis de `type`

```
QUEST_LIKE
LORE_LIKE
COMMENT_ON_QUEST
COMMENT_ON_LORE
REPLY_TO_COMMENT
QUEST_NEW_VERSION
USER_FOLLOW
```

---

## O que o front precisa fazer

### 1. `NotificationService` (`core/services/notification.service.ts`)

```ts
getNotifications(page: number): Observable<Notification[]>
getUnreadCount(): Observable<{ count: number }>
markAllRead(): Observable<void>
```

---

### 2. Interface `Notification` (`shared/models/notification.model.ts`)

```ts
export type NotificationType =
  | 'QUEST_LIKE' | 'LORE_LIKE'
  | 'COMMENT_ON_QUEST' | 'COMMENT_ON_LORE'
  | 'REPLY_TO_COMMENT' | 'QUEST_NEW_VERSION';

export interface Notification {
  id: number;
  type: NotificationType;
  actorId: string;
  actorName: string;
  targetType: 'QUEST' | 'LORE' | 'COMMENT';
  targetId: number;
  targetTitle: string | null;
  read: boolean;
  createdAt: string;
}
```

---

### 3. Polling no `Navbar`

- Fazer `GET /notifications/unread-count` a cada **60 segundos** enquanto o usuário estiver autenticado
- Exibir o número no ícone de sino (badged)
- Zerar o badge ao abrir o painel
- Usar `interval` do RxJS + `takeUntilDestroyed`

---

### 4. Painel de notificações (dropdown no navbar)

- Abrir ao clicar no sino
- Chamar `GET /notifications?page=0` ao abrir
- Chamar `PATCH /notifications/read-all` ao abrir (ou ao fechar)
- Exibir texto amigável por tipo (ver tabela abaixo)
- Notificações não lidas com destaque visual (ex.: bolinha ou fundo diferente)
- Link que navega para o conteúdo ao clicar

#### Textos sugeridos por tipo

| type | Texto |
|---|---|
| `QUEST_LIKE` | **{actorName}** curtiu sua quest *"{targetTitle}"* |
| `LORE_LIKE` | **{actorName}** curtiu seu lore *"{targetTitle}"* |
| `COMMENT_ON_QUEST` | **{actorName}** comentou na sua quest *"{targetTitle}"* |
| `COMMENT_ON_LORE` | **{actorName}** comentou no seu lore *"{targetTitle}"* |
| `REPLY_TO_COMMENT` | **{actorName}** respondeu seu comentário |
| `QUEST_NEW_VERSION` | A quest *"{targetTitle}"* que você segue recebeu uma atualização |
| `USER_FOLLOW` | **{actorName}** começou a te seguir |

#### Destino do link ao clicar

| targetType | Rota |
|---|---|
| `QUEST` | `/quest-detail/{targetId}` |
| `LORE` | `/lore/{targetId}` |
| `COMMENT` | `/quest-detail/{targetId}` (não temos rota de comentário direto) |

---

### 5. Paginação (opcional, fase 2)

Se o painel crescer, adicionar botão "Ver mais" que chama `page=1`, `page=2`, etc., e concatena os resultados.

---

## Resumo do fluxo completo

```
App inicia + usuário autenticado
    ↓
Navbar inicia polling: GET /notifications/unread-count a cada 60s
    ↓
badge no sino = response.count
    ↓
Usuário clica no sino
    ↓
GET /notifications?page=0  →  lista no painel
POST /notifications/read-all  →  badge vai a 0
    ↓
Usuário clica em uma notificação → navega para o conteúdo
```
