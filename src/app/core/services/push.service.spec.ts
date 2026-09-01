import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { Observable, of, throwError } from 'rxjs';
import { HttpService } from '@xcorpiiion/ng-core';
import { PushService } from './push.service';

/** O mínimo do SwPush que o serviço usa. */
class SwPushFake {
  isEnabled = true;
  subscription = of<PushSubscription | null>(null);
  requestSubscription = vi.fn();
  unsubscribe = vi.fn(() => Promise.resolve());
}

/**
 * O `post` do `ApiResource` recebe caminho e corpo, e os testes leem os dois de
 * `mock.calls`. `vi.fn(() => ...)` infere aridade zero, e a leitura nao compilaria.
 */
type MockPost = Mock<(caminho?: string, corpo?: unknown) => Observable<undefined>>;

const inscricaoFalsa = (endpoint = 'https://fcm/abc') =>
  ({
    endpoint,
    getKey: (nome: string) =>
      new TextEncoder().encode(nome === 'p256dh' ? 'chave-p256' : 'chave-auth').buffer,
  }) as unknown as PushSubscription;

function montar(opcoes: {
  chave?: string | null;
  habilitada?: boolean;
  falhaNaChave?: boolean;
  swAtivo?: boolean;
  inscricaoAtual?: PushSubscription | null;
  permissao?: NotificationPermission;
}) {
  const api = {
    get: vi.fn(() =>
      opcoes.falhaNaChave
        ? throwError(() => ({ status: 500 }))
        : of({ publicKey: opcoes.chave ?? null, habilitada: opcoes.habilitada ?? true }),
    ),
    post: vi.fn(() => of(undefined)) as unknown as MockPost,
  };

  const sw = new SwPushFake();
  sw.isEnabled = opcoes.swAtivo ?? true;
  sw.subscription = of(opcoes.inscricaoAtual ?? null);

  vi.stubGlobal('Notification', { permission: opcoes.permissao ?? 'default' });

  TestBed.configureTestingModule({
    providers: [
      PushService,
      { provide: SwPush, useValue: sw },
      { provide: HttpService, useValue: { resource: () => api } },
    ],
  });

  return { service: TestBed.inject(PushService), api, sw };
}

describe('PushService', () => {
  beforeEach(() => TestBed.resetTestingModule());
  afterEach(() => vi.unstubAllGlobals());

  describe('quando o recurso pode ser oferecido', () => {
    it('com chave e service worker, fica disponível', async () => {
      const { service } = montar({ chave: 'BChavePublica' });

      await service.carregar();

      expect(service.disponivel()).toBe(true);
    });

    /**
     * O servidor pode estar com o push desligado — é o default dele. Sem esta checagem, o
     * botão apareceria e a inscrição falharia depois de a pessoa já ter concedido a
     * permissão do navegador, que é o pior momento possível para descobrir.
     */
    it('servidor com push desligado não oferece o botão', async () => {
      const { service } = montar({ chave: null, habilitada: false });

      await service.carregar();

      expect(service.disponivel()).toBe(false);
    });

    /** `ng serve` não registra service worker: `isEnabled` é falso e nada disto funciona. */
    it('sem service worker não oferece o botão', async () => {
      const { service } = montar({ chave: 'BChavePublica', swAtivo: false });

      await service.carregar();

      expect(service.disponivel()).toBe(false);
    });

    /**
     * Permissão negada não pode ser pedida de novo por código: o navegador rejeita sem
     * mostrar nada. Um botão aqui ficaria para sempre sem efeito.
     */
    it('permissão já negada não oferece o botão', async () => {
      const { service } = montar({ chave: 'BChavePublica', permissao: 'denied' });

      await service.carregar();

      expect(service.disponivel()).toBe(false);
    });

    /**
     * Push é um extra. Servidor fora do ar não pode virar erro na tela de quem só queria
     * ler um guia — degrada, como o `UserDirectory` do back-end faz com a user-api.
     */
    it('falha ao consultar o servidor degrada em silêncio', async () => {
      const { service } = montar({ falhaNaChave: true });

      await expect(service.carregar()).resolves.toBeUndefined();
      expect(service.disponivel()).toBe(false);
    });

    it('antes de consultar o servidor, nada é oferecido', () => {
      const { service } = montar({ chave: 'BChavePublica' });

      expect(service.disponivel()).toBe(false);
    });
  });

  describe('estado da inscrição', () => {
    /**
     * Quem sabe se ESTE aparelho está inscrito é o navegador, não o servidor: a pessoa tem
     * o celular e o computador, e o servidor responderia pelos dois.
     */
    it('lê a inscrição existente do navegador', async () => {
      const { service } = montar({ chave: 'BChavePublica', inscricaoAtual: inscricaoFalsa() });

      await service.carregar();

      expect(service.inscrito()).toBe(true);
    });

    it('sem inscrição no navegador, nasce desinscrito', async () => {
      const { service } = montar({ chave: 'BChavePublica' });

      await service.carregar();

      expect(service.inscrito()).toBe(false);
    });

    it('consulta o servidor uma vez só, mesmo reabrindo o painel', async () => {
      const { service, api } = montar({ chave: 'BChavePublica' });

      await service.carregar();
      await service.carregar();

      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('inscrever', () => {
    it('manda o endpoint e as duas chaves para o servidor', async () => {
      const { service, api, sw } = montar({ chave: 'BChavePublica' });
      sw.requestSubscription.mockResolvedValue(inscricaoFalsa());
      await service.carregar();

      const ok = await service.inscrever();

      expect(ok).toBe(true);
      expect(service.inscrito()).toBe(true);
      expect(sw.requestSubscription).toHaveBeenCalledWith({ serverPublicKey: 'BChavePublica' });
      expect(api.post).toHaveBeenCalledWith(
        'subscriptions',
        expect.objectContaining({ endpoint: 'https://fcm/abc' }),
      );
    });

    /**
     * As chaves vão em base64**url**. Base64 comum (`+`, `/`, `=`) faz a cifra falhar do
     * outro lado, e o erro chega como "push recusado" sem dizer por quê — falha calada, no
     * celular de outra pessoa.
     */
    it('codifica as chaves em base64url, sem +, / nem =', async () => {
      const { service, api, sw } = montar({ chave: 'BChavePublica' });
      sw.requestSubscription.mockResolvedValue(inscricaoFalsa());
      await service.carregar();

      await service.inscrever();

      const corpo = api.post.mock.calls.at(0)?.at(1) as unknown as {
        p256dh: string;
        auth: string;
      };
      expect(corpo.p256dh).not.toMatch(/[+/=]/);
      expect(corpo.auth).not.toMatch(/[+/=]/);
      expect(corpo.p256dh.length).toBeGreaterThan(0);
    });

    /** Recusar a permissão é uma resposta, não um erro: nada de toast vermelho. */
    it('permissão recusada devolve false, sem estourar', async () => {
      const { service, sw } = montar({ chave: 'BChavePublica' });
      sw.requestSubscription.mockRejectedValue(new Error('permission denied'));
      await service.carregar();

      await expect(service.inscrever()).resolves.toBe(false);
      expect(service.inscrito()).toBe(false);
    });

    it('sem chave do servidor não tenta inscrever', async () => {
      const { service, sw } = montar({ chave: null, habilitada: false });
      await service.carregar();

      await expect(service.inscrever()).resolves.toBe(false);
      expect(sw.requestSubscription).not.toHaveBeenCalled();
    });
  });

  describe('desinscrever', () => {
    /**
     * O servidor é avisado ANTES de o navegador esquecer o endpoint. Na ordem inversa não
     * há mais o que mandar, e a linha ficaria no banco recebendo envio até o serviço de
     * push responder 410.
     */
    it('avisa o servidor antes de o navegador esquecer o endpoint', async () => {
      const { service, api, sw } = montar({
        chave: 'BChavePublica',
        inscricaoAtual: inscricaoFalsa(),
      });
      const ordem: string[] = [];
      api.post.mockImplementation(() => {
        ordem.push('servidor');
        return of(undefined);
      });
      sw.unsubscribe.mockImplementation(() => {
        ordem.push('navegador');
        return Promise.resolve();
      });
      await service.carregar();

      await service.desinscrever();

      expect(ordem).toEqual(['servidor', 'navegador']);
      expect(api.post).toHaveBeenCalledWith(
        'subscriptions/unsubscribe',
        expect.objectContaining({ endpoint: 'https://fcm/abc' }),
      );
      expect(service.inscrito()).toBe(false);
    });

    /**
     * Servidor fora do ar não pode prender a pessoa inscrita: ela pediu para parar de
     * receber, e o navegador é quem de fato para. A linha órfã no banco morre sozinha no
     * primeiro 410.
     */
    it('servidor fora do ar não impede o navegador de desinscrever', async () => {
      const { service, api, sw } = montar({
        chave: 'BChavePublica',
        inscricaoAtual: inscricaoFalsa(),
      });
      api.post.mockReturnValue(throwError(() => ({ status: 500 })));
      await service.carregar();

      await service.desinscrever();

      expect(sw.unsubscribe).toHaveBeenCalled();
      expect(service.inscrito()).toBe(false);
    });
  });
});
