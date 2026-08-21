import { describe, it, expect } from 'vitest';
import type { GameSectionRef } from './game-section.model';
import { agruparPorSecao, sectionLabel, sectionLabelTitulo } from './game-section.model';

const secao = (id: number, name: string): GameSectionRef => ({ id, name, orderIndex: 0 });

/**
 * O outro lado da ADR 0020 do back-end.
 *
 * Lá a decisão é que a subdivisão do jogo é **uma** entidade para as duas famílias; aqui é
 * que a palavra na tela é decisão de tela. Um teste porque a alternativa — mandar o rótulo
 * na resposta — é o que este arquivo existe para não precisar fazer.
 */
describe('rótulo da seção', () => {
  it('souls-like diz região; terror diz capítulo', () => {
    expect(sectionLabel('SOULS_LIKE')).toBe('região');
    expect(sectionLabel('SURVIVAL_HORROR')).toBe('capítulo');
    expect(sectionLabel('PSYCHOLOGICAL_HORROR')).toBe('capítulo');
    expect(sectionLabel('ACTION_HORROR')).toBe('capítulo');
  });

  /**
   * Jogo recém-cadastrado cai em `OTHER` no back-end, e a tela pode montar antes de o jogo
   * carregar. Chutar a família mais comum escreveria 'região' na página de Silent Hill no
   * intervalo — errado e visível.
   */
  it('sem gênero conhecido, o rótulo é neutro', () => {
    expect(sectionLabel(null)).toBe('seção');
    expect(sectionLabel(undefined)).toBe('seção');
    expect(sectionLabel('OTHER')).toBe('seção');
  });

  it('a versão de título só muda a inicial', () => {
    expect(sectionLabelTitulo('SOULS_LIKE')).toBe('Região');
    expect(sectionLabelTitulo('SURVIVAL_HORROR')).toBe('Capítulo');
  });
});

describe('agrupamento por seção', () => {
  it('mantém a ordem de chegada, não a alfabética', () => {
    const grupos = agruparPorSecao([
      { section: secao(2, 'Hospital') },
      { section: secao(1, 'Delegacia') },
    ]);

    expect(grupos.map((g) => g.nome)).toEqual(['Hospital', 'Delegacia']);
  });

  /**
   * Duas linhas da mesma seção caem no mesmo grupo mesmo separadas por outra — é o que
   * diferencia este agrupamento do da lista de passos de final, que só funde vizinhos.
   */
  it('junta a mesma seção ainda que não venham em sequência', () => {
    const grupos = agruparPorSecao([
      { section: secao(1, 'Delegacia') },
      { section: secao(2, 'Hospital') },
      { section: secao(1, 'Delegacia') },
    ]);

    expect(grupos).toHaveLength(2);
    expect(grupos[0].itens).toHaveLength(2);
  });

  /** Conteúdo sem seção não some da lista: a ponta é anulável de propósito no back-end. */
  it('sem seção, cai no grupo de fallback em vez de sumir', () => {
    const grupos = agruparPorSecao([{ section: null }, { section: undefined }], 'sem capítulo');

    expect(grupos).toHaveLength(1);
    expect(grupos[0].nome).toBe('sem capítulo');
    expect(grupos[0].itens).toHaveLength(2);
  });

  /** Nome só de espaço é o mesmo caso de nome ausente, e não um grupo chamado ' '. */
  it('nome em branco conta como ausente', () => {
    const grupos = agruparPorSecao([{ section: secao(1, '   ') }], 'sem seção');

    expect(grupos[0].nome).toBe('sem seção');
  });
});
