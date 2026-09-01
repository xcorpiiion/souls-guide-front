import { Injectable, computed, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpService } from '@xcorpiiion/ng-core';
import { firstValueFrom } from 'rxjs';
import type { PushPublicKeyResponse, PushSubscriptionRequest } from '@xcorpiiion/canonico';

/**
 * O aviso que chega com o site fechado.
 *
 * <h2>Por que existe</h2>
 * A navbar pergunta o `unread-count` de minuto em minuto: uma requisição por aba por minuto
 * para quase sempre receber zero, e nada para quem fechou a aba. Um guia é lido enquanto se
 * joga, no celular do lado da TV — notificação que só existe com o site aberto é
 * notificação que não chega.
 *
 * <h2>O que quebra calado, e como isto evita</h2>
 * O push depende de quatro coisas alinhadas, e nenhuma delas avisa quando falta:
 *
 * - **o service worker**, que não existe em `ng serve` (`isEnabled` é falso) nem em
 *   navegador sem suporte;
 * - **a chave VAPID do servidor**, que pode estar desligada — e por isso `disponivel` só é
 *   verdade depois de o servidor confirmar;
 * - **a permissão do navegador**, que uma vez negada não pode ser pedida de novo por
 *   código: o navegador simplesmente rejeita sem mostrar nada;
 * - **HTTPS**, ou `localhost`.
 *
 * O estado é resolvido antes de a tela oferecer qualquer coisa, e é por isso que
 * `disponivel` existe separado de `inscrito`: oferecer um botão que vai falhar é pior do
 * que não oferecer o recurso.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly swPush = inject(SwPush);
  private readonly api = inject(HttpService).resource('push');

  private readonly chavePublica = signal<string | null>(null);
  private readonly _inscrito = signal(false);
  private readonly _ocupado = signal(false);

  /** Já perguntamos ao servidor? Antes disso a tela não decide nada. */
  private readonly consultado = signal(false);

  readonly inscrito = this._inscrito.asReadonly();
  readonly ocupado = this._ocupado.asReadonly();

  /**
   * O recurso pode ser oferecido nesta máquina, neste navegador, agora.
   *
   * <p>`Notification.permission === 'denied'` entra aqui de propósito: negada, a permissão
   * não pode ser pedida de novo por código, e o botão ficaria para sempre sem efeito.
   */
  readonly disponivel = computed(
    () =>
      this.consultado() &&
      this.swPush.isEnabled &&
      this.chavePublica() !== null &&
      this.permissao() !== 'denied',
  );

  private permissao(): NotificationPermission | 'indisponivel' {
    if (typeof Notification === 'undefined') return 'indisponivel';
    return Notification.permission;
  }

  /**
   * Descobre se o push está de pé e se este navegador já está inscrito.
   *
   * <p>Falha em silêncio de propósito: push é um extra, e um servidor sem VAPID
   * configurada não pode virar erro na tela de quem só quer ler um guia. O mesmo desenho
   * do `UserDirectory` do back-end — degrada, não quebra.
   */
  async carregar(): Promise<void> {
    if (this.consultado()) return;

    try {
      const resposta = await firstValueFrom(this.api.get<PushPublicKeyResponse>('public-key'));
      this.chavePublica.set(resposta.habilitada ? (resposta.publicKey ?? null) : null);
    } catch {
      this.chavePublica.set(null);
    } finally {
      this.consultado.set(true);
    }

    if (!this.swPush.isEnabled) return;

    // A inscrição existente vem do navegador, não do servidor: é ele que sabe se este
    // aparelho já tem uma, e perguntar ao servidor daria a resposta de outro aparelho.
    const atual = await firstValueFrom(this.swPush.subscription);
    this._inscrito.set(!!atual);
  }

  /** Pede a permissão, inscreve o navegador e conta ao servidor. */
  async inscrever(): Promise<boolean> {
    const chave = this.chavePublica();
    if (!chave || !this.swPush.isEnabled || this._ocupado()) return false;

    this._ocupado.set(true);
    try {
      const inscricao = await this.swPush.requestSubscription({ serverPublicKey: chave });
      await firstValueFrom(this.api.post<void>('subscriptions', paraRequest(inscricao)));
      this._inscrito.set(true);
      return true;
    } catch {
      // Recusar a permissão é uma resposta, não um erro: quem clicou em "bloquear" já
      // disse o que queria, e um toast vermelho depois disso é o site discutindo.
      this._inscrito.set(false);
      return false;
    } finally {
      this._ocupado.set(false);
    }
  }

  /**
   * Desinscreve, e avisa o servidor **antes** de o navegador esquecer o endpoint.
   *
   * <p>Invertida, a ordem perde o endereço: depois do `unsubscribe` do navegador não há
   * mais o que mandar, e a linha ficaria no banco recebendo envio para sempre — até o
   * serviço de push responder 410 e a limpeza do servidor pegar. Funciona, mas leva um
   * aviso a mais e uma ida à rede por notificação nesse meio-tempo.
   */
  async desinscrever(): Promise<void> {
    if (!this.swPush.isEnabled || this._ocupado()) return;

    this._ocupado.set(true);
    try {
      const atual = await firstValueFrom(this.swPush.subscription);
      if (atual) {
        // POST, e nao DELETE: o endpoint vai no corpo (longo demais para a URL, e
        // endereco de aparelho nao deve acabar em log de acesso), e corpo em DELETE nao e
        // confiavel -- proxies o descartam, e o `ApiResource` da plataforma nem o oferece.
        await firstValueFrom(
          this.api.post<void>('subscriptions/unsubscribe', paraRequest(atual)),
        ).catch(() => undefined);
        await this.swPush.unsubscribe();
      }
      this._inscrito.set(false);
    } finally {
      this._ocupado.set(false);
    }
  }
}

/**
 * O que o navegador entrega, no formato que o servidor guarda.
 *
 * <p>As duas chaves saem de `getKey`, que devolve `ArrayBuffer`, e vão em base64url — o
 * mesmo alfabeto que o servidor usa para cifrar. Base64 comum (`+`, `/`, `=`) faria a cifra
 * falhar do outro lado, e o erro apareceria como "push recusado" sem dizer por quê.
 */
function paraRequest(inscricao: PushSubscription): PushSubscriptionRequest {
  return {
    endpoint: inscricao.endpoint,
    p256dh: base64url(inscricao.getKey('p256dh')),
    auth: base64url(inscricao.getKey('auth')),
  };
}

function base64url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
