import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * O lado do navegador no login com Discord.
 *
 * <p>O fluxo tem duas metades e elas moram em telas diferentes: a página de login manda
 * para o Discord, e `/login/discord` recebe a volta. Este serviço é o que as duas
 * compartilham — o `state`, o `redirect_uri` e o formato da URL de autorização.
 *
 * <p><b>Por que não é o mesmo desenho do Google.</b> O Google devolve um `id_token`
 * assinado dentro da própria página, e o botão dele nem sai daqui. O Discord não emite
 * `id_token`: ele manda o navegador para a tela de autorização e devolve um **código**,
 * que só vira acesso quando trocado pelo servidor, com o client secret. É por isso que há
 * um redirecionamento inteiro no meio, e uma rota só para receber a volta.
 */
@Injectable({ providedIn: 'root' })
export class DiscordLoginService {
  /**
   * Onde o `state` espera enquanto o navegador está no Discord.
   *
   * `sessionStorage` e não `localStorage`: o valor vale para esta aba e esta visita, e
   * sobrar depois só aumentaria a chance de um `state` velho ser aceito.
   */
  private static readonly CHAVE_STATE = 'sg_discord_state';

  /** A URL de callback. Precisa bater com o cadastrado no portal do Discord e com o `DISCORD_REDIRECT_URI` do back. */
  get redirectUri(): string {
    return `${window.location.origin}/login/discord`;
  }

  /** Se o botão tem o que fazer. Sem client id configurado, ele nem aparece. */
  get configurado(): boolean {
    return !!environment.discordClientId;
  }

  /** Manda o navegador para a tela de autorização do Discord. */
  iniciar(): void {
    const state = this.novoState();
    sessionStorage.setItem(DiscordLoginService.CHAVE_STATE, state);

    const url = new URL('https://discord.com/oauth2/authorize');
    url.searchParams.set('client_id', environment.discordClientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    // `identify` traz id e nome; `email` é o que permite achar a conta daqui. Sem ele o
    // back recusa o login, porque o vínculo é pelo e-mail.
    url.searchParams.set('scope', 'identify email');
    url.searchParams.set('state', state);
    // Pula a tela de autorização para quem já autorizou uma vez. Quem nunca autorizou
    // continua vendo a tela normalmente.
    url.searchParams.set('prompt', 'none');

    window.location.assign(url.toString());
  }

  /**
   * Confere o `state` que voltou do Discord, e o consome.
   *
   * <p>É o que separa "esta pessoa clicou no botão" de "alguém a fez visitar
   * `/login/discord?code=...`". Sem a conferência, um código obtido em outra sessão
   * poderia ser entregue ao navegador de terceiro, que entraria na conta errada sem
   * perceber — o CSRF que o `state` existe para impedir.
   *
   * <p>Consome mesmo quando não bate: um `state` que sobrevive à falha pode ser tentado
   * de novo.
   */
  conferirState(recebido: string | null): boolean {
    const guardado = sessionStorage.getItem(DiscordLoginService.CHAVE_STATE);
    sessionStorage.removeItem(DiscordLoginService.CHAVE_STATE);
    return !!recebido && !!guardado && recebido === guardado;
  }

  /**
   * 32 bytes de aleatoriedade criptográfica em hexa.
   *
   * `Math.random()` não serve aqui: é previsível o bastante para que um `state` possa ser
   * adivinhado, e adivinhá-lo é exatamente o ataque.
   */
  private novoState(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
