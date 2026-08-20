import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@xcorpiiion/ng-core';
import { DiscordLoginService } from '../../../core/services/discord-login.service';

/**
 * A volta do Discord: `/login/discord?code=...&state=...`.
 *
 * <p>Tela de passagem — ela não pede nada a ninguém. Confere o `state`, troca o código
 * pelos tokens no back e sai. O que se vê é o tempo de uma chamada; o que sobra na tela é
 * só o caso de erro, que sem isto viraria uma página em branco com um código na URL.
 */
@Component({
  selector: 'app-discord-callback',
  imports: [RouterLink],
  templateUrl: './discord-callback.html',
  styleUrl: './discord-callback.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscordCallback implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly discord = inject(DiscordLoginService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const erro = params.get('error');
    const code = params.get('code');

    // Quem clicou em "Cancelar" na tela do Discord volta com error=access_denied. Não é
    // falha: é uma pessoa desistindo, e a resposta certa é a tela de login de volta.
    if (erro === 'access_denied') {
      void this.router.navigate(['/login']);
      return;
    }
    if (erro || !code) {
      this.errorMsg.set('O Discord não concluiu a autorização. Tente entrar de novo.');
      return;
    }
    if (!this.discord.conferirState(params.get('state'))) {
      // Ou a aba não é a que começou o login, ou alguém montou esta URL. Nos dois casos
      // o código não deve ser trocado.
      this.errorMsg.set(
        'Não foi possível confirmar que este login partiu daqui. Comece de novo pela tela de entrar.',
      );
      return;
    }

    this.auth.loginWithSocialToken(code, 'discord').subscribe({
      next: (tokens) => {
        this.auth.saveTokens(tokens);
        // replaceUrl: a URL do callback carrega um código já gasto. Deixá-la no histórico
        // faz o "voltar" do navegador cair num login que responde 400.
        void this.router.navigate(['/home'], { replaceUrl: true });
      },
      error: () => {
        this.errorMsg.set(
          'Falha no login com Discord. Verifique se o e-mail da sua conta Discord está confirmado.',
        );
      },
    });
  }
}
