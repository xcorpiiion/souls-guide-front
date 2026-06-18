# Notificação individual — Marcar como lida

## Novo endpoint

### `POST /notifications/{id}/read`

Marca uma notificação específica como lida. Exige autenticação.

- **`{id}`** — o `id` da notificação (campo `id` do `NotificationResponse`)
- **Response `204 No Content`** — marcada com sucesso
- **Response `404`** — notificação não existe
- **Response `403`** — a notificação não pertence ao usuário autenticado

Não tem body.

---

## O que o front precisa fazer

### 1. `notification.service.ts` — adicionar método

```ts
markOneRead(notificationId: number): Observable<void> {
  return this.http.post<void>(`/notifications/${notificationId}/read`, null);
}
```

### 2. No clique de uma notificação no painel

Fluxo recomendado — atualizar localmente **e** persistir no servidor:

```
usuário clica na notificação
    ↓
1. atualizar o item local: notification.read = true
2. decrementar o badge: unreadCount - 1 (se era não lida)
3. chamar POST /notifications/{id}/read (fire-and-forget)
4. navegar para o conteúdo (targetType + targetId)
```

O passo 3 pode ser fire-and-forget — se falhar, não bloqueia a navegação. Na próxima vez que o usuário abrir o painel, a contagem volta do servidor.

### 3. Não precisar recarregar a lista

Após clicar, **não** fazer novo `GET /notifications` — só atualizar o item na lista local via signal/immer/spread.

---

## Resumo de todos os endpoints de notificação

| Endpoint | Descrição |
|---|---|
| `GET /notifications?page=0` | Lista paginada (20 por página) |
| `GET /notifications/unread-count` | Contagem de não lidas (para polling) |
| `POST /notifications/{id}/read` | Marca uma notificação como lida ← **novo** |
| `POST /notifications/read-all` | Marca todas como lidas |
