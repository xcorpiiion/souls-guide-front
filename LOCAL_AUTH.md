# Login e Cadastro Local (email + senha)

Complementa o `GOOGLE_AUTH.md`. Assume que o `AuthService`, o `authInterceptor` e a rota `/login` já existem.

---

## Endpoints do backend

### Login
```
POST http://localhost:8765/authorization-api/auth/login
Content-Type: application/json

{ "email": "ash@pokemon.com", "password": "pikachu123" }

→ { "accessToken": "...", "refreshToken": "...", "tokenType": "Bearer" }
```

### Cadastro
```
POST http://localhost:8765/authorization-api/auth/signup
Content-Type: application/json

{ "name": "Ash", "nickname": "ash_ketchum", "email": "ash@pokemon.com", "password": "pikachu123" }

→ { "accessToken": "...", "refreshToken": "...", "tokenType": "Bearer" }
```

> Campos obrigatórios no cadastro: `name`, `nickname`, `email`, `password`.
> Endereço e telefone **não são obrigatórios**.

---

## 1. Adicionar métodos no `AuthService`

Arquivo: `src/app/core/services/auth.service.ts`

Adicionar junto aos métodos existentes:

```typescript
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  nickname: string;
  email: string;
  password: string;
}

// dentro da classe AuthService:

login(data: LoginRequest) {
  return this.http.post<AuthTokens>(`${this.base}/login`, data);
}

signup(data: SignupRequest) {
  return this.http.post<AuthTokens>(`${this.base}/signup`, data);
}
```

---

## 2. Atualizar a página de Login

A página `/login` deve ter **duas abas**: "Entrar" e "Criar conta".

Arquivo: `src/app/features/login/login.ts`

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly activeTab = signal<'login' | 'signup'>('login');
  protected readonly loading = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly signupForm = this.fb.group({
    name: ['', Validators.required],
    nickname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/home']);
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response) => this.handleGoogleResponse(response),
    });

    google.accounts.id.renderButton(
      document.getElementById('google-btn')!,
      { theme: 'outline', size: 'large', text: 'signin_with', locale: 'pt-BR' }
    );
  }

  protected setTab(tab: 'login' | 'signup'): void {
    this.activeTab.set(tab);
    this.errorMsg.set(null);
  }

  protected onLogin(): void {
    if (this.loginForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.loginForm.value;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (tokens) => {
        this.auth.saveTokens(tokens);
        this.router.navigate(['/home']);
      },
      error: () => {
        this.errorMsg.set('Email ou senha inválidos.');
        this.loading.set(false);
      },
    });
  }

  protected onSignup(): void {
    if (this.signupForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    const { name, nickname, email, password } = this.signupForm.value;
    this.auth.signup({ name: name!, nickname: nickname!, email: email!, password: password! }).subscribe({
      next: (tokens) => {
        this.auth.saveTokens(tokens);
        this.router.navigate(['/home']);
      },
      error: () => {
        this.errorMsg.set('Não foi possível criar a conta. O email pode já estar em uso.');
        this.loading.set(false);
      },
    });
  }

  private handleGoogleResponse(response: google.accounts.id.CredentialResponse): void {
    this.auth.loginWithGoogle(response.credential).subscribe({
      next: (tokens) => {
        this.auth.saveTokens(tokens);
        this.router.navigate(['/home']);
      },
      error: () => {
        this.errorMsg.set('Falha no login com Google.');
      },
    });
  }
}
```

---

## 3. Template da página de Login

Arquivo: `src/app/features/login/login.html`

```html
<div class="login-container">
  <h1>Souls Guide</h1>

  <!-- Abas -->
  <div class="tabs">
    <button
      [class.active]="activeTab() === 'login'"
      (click)="setTab('login')"
    >Entrar</button>
    <button
      [class.active]="activeTab() === 'signup'"
      (click)="setTab('signup')"
    >Criar conta</button>
  </div>

  <!-- Mensagem de erro -->
  @if (errorMsg()) {
    <p class="error">{{ errorMsg() }}</p>
  }

  <!-- Formulário de Login -->
  @if (activeTab() === 'login') {
    <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
      <input formControlName="email" type="email" placeholder="Email" autocomplete="email" />
      <input formControlName="password" type="password" placeholder="Senha" autocomplete="current-password" />
      <button type="submit" [disabled]="loginForm.invalid || loading()">
        {{ loading() ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>
  }

  <!-- Formulário de Cadastro -->
  @if (activeTab() === 'signup') {
    <form [formGroup]="signupForm" (ngSubmit)="onSignup()">
      <input formControlName="name" type="text" placeholder="Nome completo" autocomplete="name" />
      <input formControlName="nickname" type="text" placeholder="Nickname" autocomplete="username" />
      <input formControlName="email" type="email" placeholder="Email" autocomplete="email" />
      <input formControlName="password" type="password" placeholder="Senha (mín. 6 caracteres)" autocomplete="new-password" />
      <button type="submit" [disabled]="signupForm.invalid || loading()">
        {{ loading() ? 'Criando conta...' : 'Criar conta' }}
      </button>
    </form>
  }

  <!-- Divisor -->
  <div class="divider"><span>ou</span></div>

  <!-- Botão do Google -->
  <div id="google-btn"></div>
</div>
```

---

## 4. Estilos da página de Login

Arquivo: `src/app/features/login/login.scss`

```scss
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
  padding: 2rem;
  max-width: 400px;
  margin: 0 auto;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }
}

.tabs {
  display: flex;
  width: 100%;
  border-bottom: 2px solid var(--color-border, #333);

  button {
    flex: 1;
    padding: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: var(--color-text-secondary, #888);
    transition: color 0.2s;

    &.active {
      color: var(--color-primary, #fff);
      border-bottom: 2px solid var(--color-primary, #fff);
      margin-bottom: -2px;
      font-weight: 600;
    }
  }
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;

  input {
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
    background: var(--color-surface, #1a1a1a);
    color: var(--color-text, #fff);
    font-size: 1rem;
    width: 100%;

    &:focus {
      outline: none;
      border-color: var(--color-primary, #fff);
    }
  }

  button[type='submit'] {
    padding: 0.75rem;
    border: none;
    border-radius: 8px;
    background: var(--color-primary, #fff);
    color: var(--color-bg, #000);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.divider {
  width: 100%;
  text-align: center;
  position: relative;
  color: var(--color-text-secondary, #888);
  font-size: 0.875rem;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 42%;
    height: 1px;
    background: var(--color-border, #333);
  }

  &::before { left: 0; }
  &::after { right: 0; }
}

.error {
  color: #f87171;
  font-size: 0.875rem;
  text-align: center;
}
```

---

## 5. Registrar `ReactiveFormsModule` no `app.config.ts`

Adicionar no `providers` do `app.config.ts`:

```typescript
import { provideAnimations } from '@angular/platform-browser/animations';

// dentro de providers:
provideAnimations(),
```

> `ReactiveFormsModule` já está importado diretamente no componente — não precisa de provider global.

---

## Resumo dos arquivos modificados

| Ação | Arquivo |
|------|---------|
| Modificar | `src/app/core/services/auth.service.ts` — adicionar `login()` e `signup()` |
| Substituir | `src/app/features/login/login.ts` — versão completa com abas + formulários |
| Substituir | `src/app/features/login/login.html` — template com abas, forms e botão Google |
| Substituir | `src/app/features/login/login.scss` — estilos das abas e formulários |
