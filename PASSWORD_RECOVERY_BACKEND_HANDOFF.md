# Recuperação de Senha — Backend Handoff

Complementa o `LOCAL_AUTH.md`. Assume que o `AuthService` e a rota `/login` já existem.

---

## Fluxo resumido

1. Usuário clica em "Esqueci minha senha" na tela de login
2. Front envia o e-mail para `POST /auth/forgot-password`
3. Backend gera um token UUID, armazena no Redis (TTL 15 min) e envia um e-mail com o link:
   ```
   https://<frontend-url>/reset-password?token=<uuid>
   ```
4. Usuário clica no link, é levado à tela `/reset-password`
5. Front lê o `token` da query string e envia para `POST /auth/reset-password` junto com a nova senha
6. Backend valida o token, atualiza a senha e invalida o token

---

## Endpoints

### 1. Solicitar recuperação

```
POST http://localhost:8765/authorization-api/auth/forgot-password
Content-Type: application/json

{ "email": "ash@pokemon.com" }

→ 200 OK   (sempre — mesmo se o e-mail não existir, por segurança)
```

> Rate limit: **3 requisições a cada 10 minutos** por IP.

### 2. Redefinir senha

```
POST http://localhost:8765/authorization-api/auth/reset-password
Content-Type: application/json

{ "token": "uuid-gerado-pelo-backend", "newPassword": "novaSenha123" }

→ 200 OK                   (senha redefinida com sucesso)
→ 400 Bad Request          (token inválido ou expirado)
```

> Rate limit: **5 requisições a cada 10 minutos** por IP.

---

## Interfaces TypeScript

```typescript
// src/app/core/services/auth.service.ts — adicionar junto às interfaces existentes

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
```

---

## Métodos no `AuthService`

Arquivo: `src/app/core/services/auth.service.ts`

```typescript
// dentro da classe AuthService:

forgotPassword(data: ForgotPasswordRequest) {
  return this.http.post<void>(`${this.base}/forgot-password`, data);
}

resetPassword(data: ResetPasswordRequest) {
  return this.http.post<void>(`${this.base}/reset-password`, data);
}
```

---

## Tela "Esqueci minha senha"

Rota sugerida: `/forgot-password`

Arquivo: `src/app/features/forgot-password/forgot-password.ts`

```typescript
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.auth.forgotPassword({ email: this.form.value.email! }).subscribe({
      next: () => {
        this.sent.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Não foi possível enviar o e-mail. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
```

Arquivo: `src/app/features/forgot-password/forgot-password.html`

```html
<div class="auth-container">
  @if (sent()) {
    <p class="success">
      Se o e-mail estiver cadastrado, você receberá um link em instantes.
    </p>
  } @else {
    <h1>Recuperar senha</h1>
    <p class="hint">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>

    @if (errorMsg()) {
      <p class="error">{{ errorMsg() }}</p>
    }

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="email" type="email" placeholder="Seu e-mail" autocomplete="email" />
      <button type="submit" [disabled]="form.invalid || loading()">
        {{ loading() ? 'Enviando...' : 'Enviar link' }}
      </button>
    </form>

    <a routerLink="/login">Voltar ao login</a>
  }
</div>
```

---

## Tela "Redefinir senha"

Rota sugerida: `/reset-password` (lê `?token=` da query string)

Arquivo: `src/app/features/reset-password/reset-password.ts`

```typescript
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private token = '';

  protected readonly loading = signal(false);
  protected readonly done = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly tokenMissing = signal(false);

  protected readonly form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.tokenMissing.set(true);
      return;
    }
    this.token = token;
  }

  protected onSubmit(): void {
    if (this.form.invalid || !this.token) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.auth.resetPassword({ token: this.token, newPassword: this.form.value.newPassword! }).subscribe({
      next: () => {
        this.done.set(true);
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        const msg = err.status === 400
          ? 'O link expirou ou já foi utilizado. Solicite um novo.'
          : 'Ocorreu um erro. Tente novamente.';
        this.errorMsg.set(msg);
        this.loading.set(false);
      },
    });
  }
}
```

Arquivo: `src/app/features/reset-password/reset-password.html`

```html
<div class="auth-container">
  @if (tokenMissing()) {
    <p class="error">Link inválido. <a routerLink="/forgot-password">Solicite um novo</a>.</p>
  } @else if (done()) {
    <p class="success">Senha redefinida com sucesso! Redirecionando para o login...</p>
  } @else {
    <h1>Nova senha</h1>

    @if (errorMsg()) {
      <p class="error">{{ errorMsg() }}</p>
    }

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input
        formControlName="newPassword"
        type="password"
        placeholder="Nova senha (mín. 6 caracteres)"
        autocomplete="new-password"
      />
      <button type="submit" [disabled]="form.invalid || loading()">
        {{ loading() ? 'Salvando...' : 'Salvar nova senha' }}
      </button>
    </form>
  }
</div>
```

---

## Registrar as rotas

Arquivo: `src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  // ... rotas existentes ...
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/forgot-password/forgot-password').then(m => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/reset-password/reset-password').then(m => m.ResetPassword),
  },
];
```

---

## Adicionar link na tela de Login

No template de login (`src/app/features/login/login.html`), dentro do formulário de login, após o campo de senha:

```html
<a routerLink="/forgot-password" class="forgot-link">Esqueci minha senha</a>
```

---

## Comportamento esperado

| Situação | O que mostrar |
|---|---|
| E-mail enviado (independente se existe) | "Se o e-mail estiver cadastrado, você receberá um link em instantes." |
| Token expirado / já usado | "O link expirou ou já foi utilizado. Solicite um novo." |
| Token ausente na URL | "Link inválido. Solicite um novo." |
| Senha redefinida com sucesso | "Senha redefinida com sucesso!" → redireciona para `/login` em 3s |
| Rate limit atingido | Backend retorna 429 — mostrar "Muitas tentativas. Tente novamente em alguns minutos." |

---

## Resumo dos arquivos

| Ação | Arquivo |
|------|---------|
| Modificar | `src/app/core/services/auth.service.ts` — adicionar `forgotPassword()` e `resetPassword()` |
| Criar | `src/app/features/forgot-password/forgot-password.ts` |
| Criar | `src/app/features/forgot-password/forgot-password.html` |
| Criar | `src/app/features/reset-password/reset-password.ts` |
| Criar | `src/app/features/reset-password/reset-password.html` |
| Modificar | `src/app/app.routes.ts` — registrar `/forgot-password` e `/reset-password` |
| Modificar | `src/app/features/login/login.html` — adicionar link "Esqueci minha senha" |
