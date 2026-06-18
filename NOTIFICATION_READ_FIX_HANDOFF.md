# Fix: Marcar notificações como lidas

## O que mudou

O endpoint `PATCH /notifications/read-all` foi trocado para `POST /notifications/read-all`.

**Motivo:** `PATCH` não passa pelo preflight CORS do gateway — a requisição era bloqueada antes de chegar ao servidor.

---

## O que o front precisa corrigir

No `notification.service.ts`, trocar o método HTTP de `patch` para `post`:

```ts
// antes
markAllRead(): Observable<void> {
  return this.http.patch<void>('/notifications/read-all', null);
}

// depois
markAllRead(): Observable<void> {
  return this.http.post<void>('/notifications/read-all', null);
}
```

Só isso. Nenhuma outra mudança necessária.
