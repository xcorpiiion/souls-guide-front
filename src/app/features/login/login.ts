import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '@xcorpiiion/ng-core';
import { environment } from '../../../environments/environment';
import { DiscordLoginService } from '../../core/services/discord-login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly discord = inject(DiscordLoginService);

  /**
   * Sem client id configurado o botão não aparece, em vez de aparecer e falhar.
   * É a mesma decisão do back, que responde 400 em `/auth/discord` quando não há
   * aplicativo cadastrado — os dois lados desligam juntos.
   */
  protected readonly discordDisponivel = this.discord.configurado;

  protected readonly activeTab = signal<'login' | 'signup'>('login');
  protected readonly loading = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly signupForm = this.fb.group(
    {
      name: ['', Validators.required],
      nickname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordsMatch },
  );

  protected readonly passwordMismatch = () =>
    this.signupForm.errors?.['passwordMismatch'] && this.signupForm.get('confirmPassword')?.dirty;

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/home']);
      return;
    }

    this.iniciarGoogle();
  }

  /**
   * Monta o botão do Google, se o script dele já tiver chegado.
   *
   * <p>O `<script>` do GSI é `async` no `index.html`, então **não há garantia** de que
   * `google` exista quando o `ngOnInit` roda: numa carga lenta, com o CDN bloqueado por
   * extensão, ou sem rede, o `ReferenceError` estourava aqui e derrubava a inicialização
   * do componente inteiro — levando junto o login por senha e o botão do Discord, que não
   * têm nada a ver com o Google.
   *
   * <p>Agora ele espera o `load` do próprio script e tenta de novo. Se o script nunca
   * chegar, o resto da tela continua funcionando e só o botão do Google não aparece.
   */
  private iniciarGoogle(): void {
    if (typeof google === 'undefined') {
      document
        .querySelector<HTMLScriptElement>('script[src*="accounts.google.com/gsi"]')
        ?.addEventListener('load', () => this.iniciarGoogle(), { once: true });
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response) => this.handleGoogleResponse(response),
    });

    google.accounts.id.renderButton(document.getElementById('google-btn')!, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      locale: 'pt-BR',
    });
  }

  /**
   * Sai da página: quem conclui o login é `/login/discord`, na volta.
   *
   * <p>Diferente do Google, que resolve tudo sem sair daqui — o Discord exige a passagem
   * pela tela de autorização dele, porque o que ele devolve é um código, não um token.
   */
  protected entrarComDiscord(): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.discord.iniciar();
  }

  protected setTab(tab: 'login' | 'signup'): void {
    this.activeTab.set(tab);
    this.errorMsg.set(null);
  }

  protected onLogin(): void {
    if (this.loginForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    this.loginForm.disable();

    const { email, password } = this.loginForm.getRawValue();
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (tokens) => {
        this.auth.saveTokens(tokens);
        this.router.navigate(['/home']);
      },
      error: () => {
        this.errorMsg.set('Email ou senha inválidos.');
        this.loading.set(false);
        this.loginForm.enable();
      },
    });
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const pw = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
  }

  protected onSignup(): void {
    if (this.signupForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    this.signupForm.disable();

    const { name, nickname, email, password } = this.signupForm.getRawValue();
    this.auth
      .signup({ name: name!, nickname: nickname!, email: email!, password: password! })
      .subscribe({
        next: (tokens) => {
          this.auth.saveTokens(tokens);
          this.router.navigate(['/home']);
        },
        error: () => {
          this.errorMsg.set('Não foi possível criar a conta. O email pode já estar em uso.');
          this.loading.set(false);
          this.signupForm.enable();
        },
      });
  }

  private handleGoogleResponse(response: google.accounts.id.CredentialResponse): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth.loginWithSocialToken(response.credential).subscribe({
      next: (tokens) => {
        this.auth.saveTokens(tokens);
        this.router.navigate(['/home']);
      },
      error: () => {
        this.errorMsg.set('Falha no login com Google.');
        this.loading.set(false);
      },
    });
  }
}
