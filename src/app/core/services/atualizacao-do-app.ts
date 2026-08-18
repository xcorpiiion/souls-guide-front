import { DOCUMENT, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { ToastService } from '@xcorpiiion/ui';

/**
 * Troca de versão do app, agora que existe um service worker.
 *
 * Sem service worker, quem estava com a aba aberta durante um deploy só descobria na
 * primeira navegação, quando um chunk que o build novo apagou dava 404 — é o que o
 * `stale-bundle.ts` recupera, recarregando. O service worker muda o problema de lugar:
 * ele **serve a versão antiga inteira e consistente**, então nada quebra, e a pessoa pode
 * ficar dias numa versão velha sem nenhum sinal.
 *
 * Por isso a atualização não é silenciosa nem imediata:
 *
 * - **imediata** interromperia quem está no meio de escrever um guia;
 * - **silenciosa** é o que produz "arrumei isso ontem e o site continua igual".
 *
 * O meio-termo é recarregar na **próxima navegação**, que é um momento em que a pessoa já
 * está trocando de tela e não perde nada — com um aviso antes, para a recarga não parecer
 * um defeito.
 */
@Injectable({ providedIn: 'root' })
export class AtualizacaoDoApp {
  /**
   * Opcional de propósito. `SwUpdate` só existe quando `provideServiceWorker` entrou na
   * configuração — e ele não entra em teste de componente. Obrigatório aqui, todo teste
   * que monta o componente raiz teria que saber que existe um service worker no projeto,
   * o que é acoplamento sem contrapartida.
   */
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly doc = inject(DOCUMENT);

  private pendente = false;

  /**
   * Chamado uma vez, pelo componente raiz.
   *
   * `isEnabled` é falso no servidor e em desenvolvimento, então isto não faz nada nos
   * dois — e é o que dispensa um `isPlatformBrowser` aqui.
   */
  iniciar(): void {
    if (!this.updates?.isEnabled) return;

    const updates = this.updates;

    updates.versionUpdates
      .pipe(
        filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.pendente = true;
        this.toast.info(
          'Nova versão disponível',
          'O SoulGuide foi atualizado. A página se atualiza sozinha na próxima navegação.',
          8000,
        );
      });

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (!this.pendente) return;

        // `activateUpdate` troca a versão que o service worker serve; sem o reload em
        // seguida, a aba atual continuaria com o bundle antigo em memória.
        this.pendente = false;
        void updates.activateUpdate().then(() => this.doc.location.reload());
      });
  }
}
