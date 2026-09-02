import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { AtualizacaoDoApp } from './atualizacao-do-app';
import { ToastService } from '@xcorpiiion/ui';

@Component({ selector: 'app-dummy', template: '' })
class Dummy {}

/** O mínimo do SwUpdate que este serviço usa. */
class SwUpdateFake {
  readonly versionUpdates = new Subject<{ type: string }>();
  isEnabled = true;
  activateUpdate = vi.fn().mockResolvedValue(true);
  checkForUpdate = vi.fn().mockResolvedValue(false);
}

describe('AtualizacaoDoApp', () => {
  let sw: SwUpdateFake;
  let servico: AtualizacaoDoApp;
  let router: Router;
  let recarregou: number;

  beforeEach(() => {
    sw = new SwUpdateFake();
    recarregou = 0;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'a', component: Dummy },
          { path: 'b', component: Dummy },
        ]),
        { provide: SwUpdate, useValue: sw },
      ],
    });

    servico = TestBed.inject(AtualizacaoDoApp);
    router = TestBed.inject(Router);

    // `location.reload` não existe em jsdom de forma substituível; o serviço lê o
    // DOCUMENT justamente para isto ser trocável no teste.
    Object.defineProperty(servico as unknown as { doc: Document }, 'doc', {
      value: { location: { reload: () => recarregou++ } },
    });
  });

  it('não faz nada quando o service worker está desligado', async () => {
    sw.isEnabled = false;
    servico.iniciar();

    sw.versionUpdates.next({ type: 'VERSION_READY' });
    await router.navigateByUrl('/a');

    expect(sw.activateUpdate).not.toHaveBeenCalled();
    expect(recarregou).toBe(0);
  });

  it('avisa quando há versão nova, sem recarregar na hora', () => {
    const info = vi.spyOn(TestBed.inject(ToastService), 'info');
    TestBed.runInInjectionContext(() => servico.iniciar());

    sw.versionUpdates.next({ type: 'VERSION_READY' });

    expect(info).toHaveBeenCalled();
    expect(recarregou).toBe(0);
  });

  // Recarregar no meio do uso interromperia quem está escrevendo um guia; nunca
  // recarregar é o que produz "arrumei ontem e o site continua igual".
  it('recarrega na navegação seguinte ao aviso', async () => {
    TestBed.runInInjectionContext(() => servico.iniciar());

    sw.versionUpdates.next({ type: 'VERSION_READY' });
    await router.navigateByUrl('/a');
    await Promise.resolve();

    expect(sw.activateUpdate).toHaveBeenCalledTimes(1);
  });

  it('não recarrega em navegação quando não houve versão nova', async () => {
    TestBed.runInInjectionContext(() => servico.iniciar());

    await router.navigateByUrl('/a');
    await router.navigateByUrl('/b');

    expect(sw.activateUpdate).not.toHaveBeenCalled();
    expect(recarregou).toBe(0);
  });

  // A tela de rota desconhecida chama isto antes de se mostrar. O caso que motivou:
  // /login/discord?code=... e um documento novo, vindo de fora do site, e o app sobe na
  // versao que o service worker tem -- que pode ser de antes de a rota existir.
  describe('recuperarRotaDesconhecida', () => {
    beforeEach(() => sessionStorage.clear());

    it('troca de versão e recarrega quando o service worker acha uma nova', async () => {
      sw.checkForUpdate.mockResolvedValue(true);

      await servico.recuperarRotaDesconhecida();

      expect(sw.activateUpdate).toHaveBeenCalledTimes(1);
      expect(recarregou).toBe(1);
    });

    it('não recarrega quando já está na versão mais nova', async () => {
      sw.checkForUpdate.mockResolvedValue(false);

      await servico.recuperarRotaDesconhecida();

      // O 404 e de verdade: a tela precisa aparecer, e nao piscar numa recarga inutil.
      expect(sw.activateUpdate).not.toHaveBeenCalled();
      expect(recarregou).toBe(0);
    });

    it('tenta uma vez por aba, para um 404 legítimo não virar laço', async () => {
      sw.checkForUpdate.mockResolvedValue(true);

      await servico.recuperarRotaDesconhecida();
      await servico.recuperarRotaDesconhecida();

      expect(recarregou).toBe(1);
    });

    it('não faz nada com o service worker desligado', async () => {
      sw.isEnabled = false;

      await servico.recuperarRotaDesconhecida();

      // Vale para o servidor e para desenvolvimento: isEnabled e falso nos dois, e e o
      // que dispensa um isPlatformBrowser no servico.
      expect(sw.checkForUpdate).not.toHaveBeenCalled();
      expect(recarregou).toBe(0);
    });
  });
});
