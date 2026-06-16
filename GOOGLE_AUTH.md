# Google OAuth2 — Implementação Angular

O backend já está pronto. O endpoint é:

```
POST http://localhost:8765/authorization-api/auth/google
Body: { "socialToken": "<idToken do Google>" }
Response: { "accessToken": "...", "refreshToken": "...", "tokenType": "Bearer" }
```

O `accessToken` retornado deve ser enviado em todas as requisições protegidas como:
```
Authorization: Bearer <accessToken>
```

---

## 1. Instalar a lib do Google

```bash
npm install @types/google.accounts --save-dev
```

No `index.html`, adicionar antes do `</body>`:

```html
<script src="https://accounts.google.com/gsi/client" async></script>
```

---

## 2. Criar o `AuthService`

Criar o arquivo `src/app/core/services/auth.service.ts`:

```typescript
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

const ACCESS_TOKEN_KEY = 'sg_access_token';
const REFRESH_TOKEN_KEY = 'sg_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apis.auth}/auth`;

  readonly isLoggedIn = signal(this.hasToken());

  loginWithGoogle(idToken: string) {
    return this.http.post<AuthTokens>(`${this.base}/google`, { socialToken: idToken });
  }

  saveTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.isLoggedIn.set(true);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.isLoggedIn.set(false);
    this.router.navigate(['/home']);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  }
}
```

---

## 3. Adicionar `apis.auth` no `environment.ts`

Arquivo: `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  sentryDsn: '...', // manter o existente
  googleClientId: '125662553556-q6agb67d8q0d253docbi55kk3ps6hc9b.apps.googleusercontent.com',
  apis: {
    soulsGuide: 'http://localhost:8765/souls-guide-api',
    auth: 'http://localhost:8765/authorization-api',
  },
};
```

---

## 4. Criar o HTTP Interceptor para enviar o token

Criar `src/app/core/interceptors/auth.interceptor.ts`:

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(cloned);
  }

  return next(req);
};
```

Registrar no `app.config.ts` — trocar:

```typescript
provideHttpClient(withFetch()),
```

Por:

```typescript
import { withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';

provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
```

---

## 5. Criar a página de Login

Criar `src/app/features/login/login.ts`:

```typescript
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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

  private handleGoogleResponse(response: google.accounts.id.CredentialResponse): void {
    this.auth.loginWithGoogle(response.credential).subscribe({
      next: (tokens) => {
        this.auth.saveTokens(tokens);
        this.router.navigate(['/home']);
      },
      error: () => {
        console.error('Falha no login com Google');
      },
    });
  }
}
```

Criar `src/app/features/login/login.html`:

```html
<div class="login-container">
  <h1>Souls Guide</h1>
  <p>Entre com sua conta Google para continuar</p>
  <div id="google-btn"></div>
</div>
```

Criar `src/app/features/login/login.scss`:

```scss
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1.5rem;
  text-align: center;

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
  }

  p {
    color: var(--color-text-secondary, #888);
  }
}
```

---

## 6. Registrar a rota de login

Em `src/app/app.routes.ts`, adicionar **antes** do `'**'`:

```typescript
{
  path: 'login',
  loadComponent: () => import('./features/login/login').then((m) => m.Login),
},
```

---

## 7. Adicionar botão de login/logout na Navbar

Em `src/app/layout/navbar/navbar.ts`, injetar o `AuthService` e expor `isLoggedIn`:

```typescript
import { AuthService } from '../../core/services/auth.service';

// dentro da classe Navbar:
readonly auth = inject(AuthService);
```

No template `navbar.html`, adicionar no final da lista de links:

```html
@if (auth.isLoggedIn()) {
  <button (click)="auth.logout()">Sair</button>
} @else {
  <a routerLink="/login">Entrar</a>
}
```

---

## 8. Criar o Auth Guard (opcional mas recomendado)

Para proteger rotas que exigem login (ex: criar/editar quests):

Criar `src/app/core/guards/auth.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  router.navigate(['/login']);
  return false;
};
```

Aplicar nas rotas protegidas em `app.routes.ts`:

```typescript
import { authGuard } from './core/guards/auth.guard';

{
  path: 'games/:gameId/quests/new',
  loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
  canActivate: [authGuard],
  canDeactivate: [unsavedChangesGuard],
},
{
  path: 'games/:gameId/quests/:questId/edit',
  loadComponent: () => import('./features/quest-editor/quest-editor').then((m) => m.QuestEditor),
  canActivate: [authGuard],
  canDeactivate: [unsavedChangesGuard],
},
```

---

## Resumo dos arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| Criar | `src/app/core/services/auth.service.ts` |
| Criar | `src/app/core/interceptors/auth.interceptor.ts` |
| Criar | `src/app/features/login/login.ts` |
| Criar | `src/app/features/login/login.html` |
| Criar | `src/app/features/login/login.scss` |
| Criar | `src/app/core/guards/auth.guard.ts` |
| Modificar | `src/environments/environment.ts` — adicionar `googleClientId` e `apis.auth` |
| Modificar | `src/app/app.config.ts` — registrar `authInterceptor` |
| Modificar | `src/app/app.routes.ts` — rota `/login` e `canActivate` nas rotas protegidas |
| Modificar | `src/app/layout/navbar/navbar.ts` e `navbar.html` — botão login/logout |
| Modificar | `index.html` — script do Google GSI |
