import { describe, it, expect } from 'vitest';
import { paraId, refDe } from './ref';

describe('ref', () => {
  describe('refDe()', () => {
    it('põe o id na frente e o slug depois', () => {
      expect(refDe(45, 'ranni-a-bruxa')).toBe('45-ranni-a-bruxa');
    });

    // Conteúdo criado antes da migração pode não ter slug, e a URL continua válida.
    it('devolve só o id quando não há slug', () => {
      expect(refDe(45, null)).toBe('45');
      expect(refDe(45)).toBe('45');
      expect(refDe('45', '')).toBe('45');
    });
  });

  describe('paraId()', () => {
    it('extrai o id da referência legível', () => {
      expect(paraId('45-ranni-a-bruxa')).toBe('45');
    });

    /** É o formato de todo link já compartilhado: ele não pode parar de funcionar. */
    it('aceita o id puro', () => {
      expect(paraId('45')).toBe('45');
    });

    /**
     * O jogo é o único cujo endpoint resolve slug de verdade; aqui o texto passa intacto
     * para o servidor decidir.
     */
    it('deixa passar um slug sem id na frente', () => {
      expect(paraId('elden-ring')).toBe('elden-ring');
      expect(paraId('lies-of-p')).toBe('lies-of-p');
    });

    it('não confunde slug que começa com número', () => {
      expect(paraId('2-bosses-opcionais')).toBe('2');
    });
  });
});
