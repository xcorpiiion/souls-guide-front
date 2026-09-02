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
   * Uma tentativa de recuperação por aba.
   *
   * Sem a trava, um 404 legítimo logo depois de uma atualização viraria par
   * erro-recarrega em laço. Mesmo raciocínio do `stale-bundle.ts`.
   */
  private static readonly CHAVE_TENTOU = 'sg_recarregou_por_rota';

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

  /**
   * Chamado pela tela de rota não encontrada, antes de ela se mostrar.
   *
   * <h2>Por que o 404 do app é suspeito de ser versão velha</h2>
   * A tabela de rotas mora no bundle. Quando um deploy acrescenta uma rota, quem está com
   * o app cacheado pelo service worker continua com a tabela <b>antiga</b> — e o servidor
   * não tem como ajudar: ele responde 200 com a casca, porque para ele a URL é válida.
   * O router não acha nada, cai no `**`, e a pessoa vê "YOU DIED" numa página que existe.
   *
   * <p>O caso real foi a volta do login com Discord. `/login/discord?code=...` é um
   * carregamento de documento inteiro, vindo de fora do site: o app sobe do zero, na
   * versão que o service worker tem, e essa versão pode ser de antes de a rota existir.
   * O {@link #iniciar} não alcança esse caso — ele troca de versão na próxima navegação
   * de <i>router</i>, e aqui não houve navegação nenhuma, houve um documento novo.
   *
   * <h2>Por que aqui e não só no login do Discord</h2>
   * Tratar só aquela rota resolveria o sintoma de hoje e deixaria a armadilha armada para
   * a próxima rota nova. O 404 é o funil por onde <b>toda</b> rota desconhecida passa.
   *
   * <p>Custo de estar errado: um 404 de verdade paga uma ida ao {@code ngsw.json} antes de
   * aparecer. Só há recarga quando o service worker confirma que existe versão nova — sem
   * isso, a tela aparece na hora.
   */
  async recuperarRotaDesconhecida(): Promise<void> {
    // Falso no servidor e em desenvolvimento, o que dispensa isPlatformBrowser aqui.
    if (!this.updates?.isEnabled) return;

    try {
      if (sessionStorage.getItem(AtualizacaoDoApp.CHAVE_TENTOU)) return;
    } catch {
      // Sem sessionStorage não há como travar o laço; melhor não recarregar.
      return;
    }

    // checkForUpdate vai ao ngsw.json; devolve true quando havia versão nova para baixar.
    if (!(await this.updates.checkForUpdate())) return;

    try {
      sessionStorage.setItem(AtualizacaoDoApp.CHAVE_TENTOU, '1');
    } catch {
      return;
    }

    await this.updates.activateUpdate();
    this.doc.location.reload();
  }
}
