import { describe, it, expect } from 'vitest';
import type { StoryFindingDTO, StoryLinkDTO } from '@xcorpiiion/canonico';
import { janela, sugestoesPara, tituloDoTexto, trechos } from './arquivo.model';

function achado(id: number, title: string, body: string): StoryFindingDTO {
  return {
    id,
    gameId: 7,
    kind: 'NOTE',
    title,
    body,
    chapter: null,
    speaker: null,
    note: null,
    createdAt: '2026-09-13T20:00:00Z',
  };
}

describe('arquivo.model', () => {
  describe('trechos', () => {
    it('destaca ignorando acento e maiúscula, mas devolve o texto de quem escreveu', () => {
      expect(trechos('O Diário da enfermaria', 'diario')).toEqual([
        { texto: 'O ', achou: false },
        { texto: 'Diário', achou: true },
        { texto: ' da enfermaria', achou: false },
      ]);
    });

    it('sem busca, o texto sai inteiro e sem marca', () => {
      expect(trechos('qualquer coisa', '  ')).toEqual([{ texto: 'qualquer coisa', achou: false }]);
    });
  });

  describe('janela', () => {
    /** Destacar uma palavra que o corte escondeu seria dizer "está aqui" sem mostrar onde. */
    it('mostra a vizinhança da busca quando ela bate depois do começo', () => {
      const longo = `${'palavra '.repeat(40)}o sino tocou treze vezes`;
      const trecho = janela(longo, 'sino');

      expect(trecho.startsWith('…')).toBe(true);
      expect(trecho).toContain('sino');
    });

    it('sem busca, é o começo do texto', () => {
      expect(janela('curto\ne direto', '')).toBe('curto e direto');
    });
  });

  describe('tituloDoTexto', () => {
    it('é a primeira linha com texto', () => {
      expect(tituloDoTexto('\n\n  MULHER: Você já esteve aqui.\nEU: Nunca.')).toBe(
        'MULHER: Você já esteve aqui.',
      );
    });

    it('linha longa é cortada numa palavra, com reticências', () => {
      const titulo = tituloDoTexto('palavra '.repeat(30));
      expect(titulo.length).toBeLessThanOrEqual(81);
      expect(titulo.endsWith('…')).toBe(true);
      expect(titulo).not.toMatch(/ …$/);
    });
  });

  describe('sugestoesPara', () => {
    const achados = [
      achado(1, 'Conversa com a mulher', 'Quando o sino tocar, conte as badaladas.'),
      achado(2, 'Ordem de serviço da torre', 'O sino foi retirado em março.'),
      achado(3, 'O homem da estrada', 'Eu contei as badaladas. Foram treze.'),
      achado(4, 'Recado na porta', 'Fechei as janelas da casa.'),
    ];

    /**
     * "Badaladas" e "sino" aparecem em dois achados cada. Com o empate de raridade, vence a
     * palavra mais longa — que costuma ser a mais específica.
     */
    it('sugere quem repete a palavra mais rara que os dois têm em comum', () => {
      const s = sugestoesPara(1, achados, []);

      expect(s?.palavra).toBe('badaladas');
      expect(s?.achados.map((a) => a.id)).toEqual([3]);
    });

    it('não sugere quem já está ligado', () => {
      const ligacoes: StoryLinkDTO[] = [
        { id: 1, fromId: 3, toId: 1, kind: 'SAME_SUBJECT', why: null },
      ];
      const s = sugestoesPara(1, achados, ligacoes);

      expect(s?.palavra).toBe('sino');
      expect(s?.achados.map((a) => a.id)).toEqual([2]);
    });

    it('não sugere nada quando não há palavra em comum', () => {
      expect(sugestoesPara(4, achados, [])).toBeNull();
    });
  });
});
