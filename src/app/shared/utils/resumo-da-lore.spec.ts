import { describe, it, expect } from 'vitest';
import { resumoDaLore } from './resumo-da-lore';

describe('resumoDaLore', () => {
  /** O defeito que isto veio consertar: a listagem mostrava o markdown da citação cru. */
  it('lore que começa por citação: o parágrafo é o texto escrito, e a citação vem separada', () => {
    const r = resumoDaLore(
      '> Se você ler isto,\nnão volte pela ponte.\n— Bilhete dobrado no armário · nota, Cap. 1\n\n' +
        'O bilhete avisa antes de o sino tocar.\n\n> Treze.\n— O sino · cutscene, Cap. 3',
    );
    expect(r.paragrafo).toBe('O bilhete avisa antes de o sino tocar.');
    expect(r.citacoes).toBe(2);
    expect(r.citacao).toEqual({
      trecho: 'Se você ler isto, não volte pela ponte.',
      origem: 'Bilhete dobrado no armário · nota, Cap. 1',
    });
  });

  it('artigo escrito à mão: pula título e imagem, e tira a ênfase', () => {
    const r = resumoDaLore('## A origem\n\n![capa](file:abc)\n\nA **Rainha** *Eterna* governou.');
    expect(r.paragrafo).toBe('A Rainha Eterna governou.');
    expect(r.citacoes).toBe(0);
    expect(r.citacao).toBeNull();
  });

  it('corta o parágrafo longo numa palavra', () => {
    const r = resumoDaLore('palavra '.repeat(60), 40);
    expect(r.paragrafo.endsWith('…')).toBe(true);
    expect(r.paragrafo.length).toBeLessThanOrEqual(41);
    expect(r.paragrafo).not.toMatch(/pala…$/);
  });
});
