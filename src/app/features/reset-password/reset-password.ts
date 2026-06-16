import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
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

  protected readonly form = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordsMatch },
  );

  protected readonly passwordMismatch = () =>
    this.form.errors?.['passwordMismatch'] && this.form.get('confirmPassword')?.dirty;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.tokenMissing.set(true);
      return;
    }
    this.token = token;
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const pw = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
  }

  protected onSubmit(): void {
    if (this.form.invalid || !this.token) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.auth
      .resetPassword({ token: this.token, newPassword: this.form.value.newPassword! })
      .subscribe({
        next: () => {
          this.done.set(true);
          this.loading.set(false);
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: (err) => {
          const msg =
            err.status === 400
              ? 'O link expirou ou já foi utilizado. Solicite um novo.'
              : err.status === 429
                ? 'Muitas tentativas. Tente novamente em alguns minutos.'
                : 'Ocorreu um erro. Tente novamente.';
          this.errorMsg.set(msg);
          this.loading.set(false);
        },
      });
  }
}
