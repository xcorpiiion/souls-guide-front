import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { isChunkLoadError, limparMarcaDeRecarga, recarregarSeBundleVelho } from './stale-bundle';

const TENTOU = 'sg_recarregou_por_chunk';

describe('stale-bundle', () => {
  let recarregou: number;

  beforeEach(() => {
    sessionStorage.clear();
    recarregou = 0;

    // `location.reload` não é redefinível no jsdom: `Object.defineProperty` estoura com
    // "Cannot redefine property". `stubGlobal` troca a ligação global inteira, que é o
    // que a função lê no momento da chamada.
    vi.stubGlobal('location', { ...globalThis.location, reload: () => recarregou++ });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  describe('isChunkLoadError()', () => {
    // O texto varia por navegador e nenhum deles expõe um código: é o motivo de a
    // detecção ser por mensagem, e de este teste existir com as quatro formas.
    it.each([
      'Failed to fetch dynamically imported module: /chunk-ABC.js',
      'error loading dynamically imported module',
      'Importing a module script failed.',
      'ChunkLoadError: Loading chunk 5 failed.',
    ])('reconhece "%s"', (mensagem) => {
      expect(isChunkLoadError(new Error(mensagem))).toBe(true);
    });

    it('reconhece pelo nome do erro, não só pela mensagem', () => {
      const erro = new Error('qualquer coisa');
      erro.name = 'ChunkLoadError';
      expect(isChunkLoadError(erro)).toBe(true);
    });

    it('não confunde com erro comum de rede', () => {
      expect(isChunkLoadError(new Error('Http failure response: 500'))).toBe(false);
      expect(isChunkLoadError('timeout')).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
    });
  });

  describe('recarregarSeBundleVelho()', () => {
    it('recarrega quando o chunk não existe mais', () => {
      const tratou = recarregarSeBundleVelho(
        new Error('Failed to fetch dynamically imported module'),
      );

      expect(tratou).toBe(true);
      expect(recarregou).toBe(1);
    });

    it('não recarrega em erro que não é de chunk', () => {
      expect(recarregarSeBundleVelho(new Error('Http failure response: 500'))).toBe(false);
      expect(recarregou).toBe(0);
    });

    // Se a recarga cair de novo num bundle quebrado, o par erro-recarrega vira laço
    // infinito. Uma tentativa por aba; se não resolveu, o problema é outro e precisa
    // aparecer.
    it('recarrega uma vez só por aba', () => {
      const erro = new Error('ChunkLoadError');

      expect(recarregarSeBundleVelho(erro)).toBe(true);
      expect(recarregarSeBundleVelho(erro)).toBe(false);
      expect(recarregou).toBe(1);
    });

    it('volta a poder recarregar depois que a aplicação subiu inteira', () => {
      const erro = new Error('ChunkLoadError');

      recarregarSeBundleVelho(erro);
      limparMarcaDeRecarga();

      expect(sessionStorage.getItem(TENTOU)).toBeNull();
      expect(recarregarSeBundleVelho(erro)).toBe(true);
      expect(recarregou).toBe(2);
    });

    // Sem sessionStorage não há como travar o laço, então não recarregar é o
    // comportamento seguro — o oposto derrubaria a aba num ciclo sem fim.
    it('não recarrega quando o sessionStorage não está disponível', () => {
      const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      expect(recarregarSeBundleVelho(new Error('ChunkLoadError'))).toBe(false);
      expect(recarregou).toBe(0);

      getItem.mockRestore();
    });
  });
});
