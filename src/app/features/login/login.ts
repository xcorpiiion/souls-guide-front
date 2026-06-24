import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

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
    this.auth.loginWithGoogle(response.credential).subscribe({
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
