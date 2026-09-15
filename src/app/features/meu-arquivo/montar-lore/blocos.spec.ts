import { describe, it, expect } from 'vitest';
import type { StoryFindingDTO } from '@xcorpiiion/canonico';
import { decorar } from '../arquivo.model';
import { Bloco, juntarTextosVizinhos, lerBlocos, serializar } from './blocos';

const ACHADO: StoryFindingDTO = {
  id: 1,
  gameId: 7,
  kind: 'NOTE',
  title: 'Bilhete dobrado no armário',
  body: 'Se você ler isto,\n\nnão volte pela ponte.',
  chapter: 'Cap. 1 — Escola',
  speaker: null,
  note: null,
  createdAt: '2026-09-13T20:00:00Z',
  characterIds: [],
  lines: [],
};

function contador(): () => number {
  let n = 1;
  return () => n++;
}

describe('blocos da lore', () => {
  const porId = new Map(decorar([ACHADO], []).map((a) => [a.id, a]));

  it('serializar e ler de volta devolve o mesmo texto', () => {
    const blocos: Bloco[] = [
      { id: 1, kind: 'texto', valor: 'Três coisas não fecham.' },
      { id: 2, kind: 'citacao', achadoId: 1 },
      { id: 3, kind: 'texto', valor: 'E o sino.' },
    ];
    const markdown = serializar(blocos, porId);

    const lidos = lerBlocos(markdown, contador());
    expect(lidos).toEqual([
      expect.objectContaining({ kind: 'texto', valor: 'Três coisas não fecham.' }),
      expect.objectContaining({
        kind: 'fixa',
        trecho: 'Se você ler isto,\nnão volte pela ponte.',
        origem: '— Bilhete dobrado no armário · nota, Cap. 1 — Escola',
      }),
      expect.objectContaining({ kind: 'texto', valor: 'E o sino.' }),
    ]);
    expect(serializar(lidos, porId)).toBe(markdown);
  });

  /** A citação salva é cópia (ADR 0007): editar o achado depois não muda a lore. */
  it('a citação lida de volta guarda o trecho, e não relê o achado', () => {
    const lidos = lerBlocos(
      '> texto antigo\n— Bilhete dobrado no armário · nota, Cap. 1 — Escola',
      contador(),
    );
    const editado = new Map(decorar([{ ...ACHADO, body: 'texto novo' }], []).map((a) => [a.id, a]));
    expect(serializar(lidos, editado)).toContain('> texto antigo');
  });

  it('artigo escrito à mão, sem citação, abre como um parágrafo só', () => {
    const lidos = lerBlocos('## A origem\n\nPrimeiro parágrafo.\n\n- item\n- outro', contador());
    expect(lidos).toEqual([
      expect.objectContaining({
        kind: 'texto',
        valor: '## A origem\n\nPrimeiro parágrafo.\n\n- item\n- outro',
      }),
    ]);
  });

  it('citação sem linha de origem continua citação, e a escrita termina num parágrafo', () => {
    const lidos = lerBlocos('> só o trecho', contador());
    expect(lidos).toEqual([
      expect.objectContaining({ kind: 'fixa', trecho: 'só o trecho', origem: '' }),
      expect.objectContaining({ kind: 'texto', valor: '' }),
    ]);
  });

  it('tirar a citação do meio junta os dois parágrafos', () => {
    expect(
      juntarTextosVizinhos([
        { id: 1, kind: 'texto', valor: 'antes' },
        { id: 3, kind: 'texto', valor: 'depois' },
      ]),
    ).toEqual([{ id: 1, kind: 'texto', valor: 'antes\n\ndepois' }]);
  });
});
