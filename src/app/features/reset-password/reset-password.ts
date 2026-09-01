import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, minLength, required, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import { statusHttp } from '../../shared/utils/http-error';

/**
 * Redefinir a senha, escrito com **Signal Forms**.
 *
 * ## Por que esta tela, e só esta
 * A API é experimental (`@angular/forms/signals`, Angular 22). Migrar as sete telas que
 * usam `ReactiveFormsModule` de uma vez apostaria o formulário de criação de jogo e os
 * dois editores numa assinatura que ainda pode mudar. Esta tela é a menor que exercita o
 * que a API existe para resolver — dois campos, validação de campo, validação *entre*
 * campos e envio — e é a que menos dói se precisar voltar: dois campos e um botão.
 *
 * ## O que muda em relação ao FormBuilder
 * O estado do formulário deixa de ser um objeto paralelo ao modelo. `form()` embrulha um
 * signal e escreve **nele**: `model()` é a fonte da verdade, não `form.value`, e não há
 * mais o par `form.value.newPassword!` com a não-nulidade afirmada na mão porque o
 * `FormBuilder` tipa tudo como opcional.
 *
 * A validação cruzada é a diferença que se sente. No `FormBuilder` ela era um validator
 * no *grupo*, lendo os filhos por nome em string (`group.get('newPassword')`) — sem tipo,
 * sem o compilador conferindo o nome —, e o erro nascia no grupo, então a tela precisava
 * de um `passwordMismatch()` só para perguntar ao grupo um erro que é de um campo. Aqui a
 * regra mora no campo que está errado e lê o outro pelo caminho tipado.
 */
@Component({
  selector: 'app-reset-password',
  imports: [FormField, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  protected readonly tokenMissing = !this.token;

  protected readonly loading = signal(false);
  protected readonly done = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  /** O modelo é a fonte da verdade; `form()` escreve nele em vez de manter uma cópia. */
  private readonly model = signal({ newPassword: '', confirmPassword: '' });

  protected readonly form = form(this.model, (senha) => {
    required(senha.newPassword, { message: 'Informe a nova senha.' });
    minLength(senha.newPassword, 6, { message: 'A senha precisa de ao menos 6 caracteres.' });
    required(senha.confirmPassword, { message: 'Repita a nova senha.' });

    // A regra mora no campo que fica vermelho, e lê o outro pelo caminho tipado — não
    // por `get('newPassword')`, que é string e ninguém confere.
    validate(senha.confirmPassword, (ctx) => {
      const repetida = ctx.value();
      if (!repetida || repetida === ctx.valueOf(senha.newPassword)) return null;
      return { kind: 'senhasDiferentes', message: 'As senhas não coincidem.' };
    });
  });

  /** Só reclama depois que a pessoa saiu do campo — erro que aparece na primeira tecla irrita. */
  protected readonly erroDaConfirmacao = computed(() => {
    const campo = this.form.confirmPassword();
    return campo.touched() ? (campo.errors()[0]?.message ?? null) : null;
  });

  protected readonly podeEnviar = computed(() => this.form().valid() && !this.loading());

  /**
   * O evento é o `submit` nativo, e não `ngSubmit`.
   *
   * `ngSubmit` é output de `NgForm`/`FormGroupDirective`, que vinham do
   * `ReactiveFormsModule`. Sem esse módulo — e Signal Forms não o traz — `(ngSubmit)`
   * não se liga a nada: nenhum erro de compilação, nenhum aviso, e o botão simplesmente
   * não faz nada. Foi o teste de envio que encontrou isso.
   *
   * Com o evento nativo, o `preventDefault` deixa de ser opcional: sem ele o navegador
   * recarrega a página no submit.
   */
  protected async onSubmit(evento: Event): Promise<void> {
    evento.preventDefault();
    if (!this.podeEnviar() || !this.token) return;

    this.loading.set(true);
    this.errorMsg.set(null);

    await submit(this.form, async () => {
      try {
        await firstValueFrom(this.auth.resetPassword(this.token, this.model().newPassword));
        this.done.set(true);
        setTimeout(() => this.router.navigate(['/login']), 3000);
      } catch (err) {
        this.errorMsg.set(this.recado(statusHttp(err)));
      } finally {
        this.loading.set(false);
      }
      return undefined;
    });
  }

  private recado(status: number): string {
    if (status === 400) return 'O link expirou ou já foi utilizado. Solicite um novo.';
    if (status === 429) return 'Muitas tentativas. Tente novamente em alguns minutos.';
    return 'Ocorreu um erro. Tente novamente.';
  }
}
