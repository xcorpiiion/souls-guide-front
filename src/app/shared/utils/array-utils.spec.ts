import { describe, expect, it } from 'vitest';
import { success } from '../models/result';
import { chunk, groupBy, safeFind, sortBy, splitBy, toDictionary, uniqBy } from './array-utils';

describe('groupBy', () => {
  it('agrupa itens pela chave fornecida', () => {
    const items = [
      { game: 'ER', name: 'Ranni' },
      { game: 'DS3', name: 'Siegward' },
      { game: 'ER', name: 'Blaidd' },
    ];
    const result = groupBy(items, (i) => i.game);
    expect(result['ER']).toHaveLength(2);
    expect(result['DS3']).toHaveLength(1);
  });

  it('retorna objeto vazio para array vazio', () => {
    expect(groupBy([], (i: { id: number }) => i.id)).toEqual({});
  });
});

describe('uniqBy', () => {
  it('remove duplicatas pela chave', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
    expect(uniqBy(items, (i) => i.id)).toHaveLength(2);
  });

  it('mantém a primeira ocorrência', () => {
    const items = [
      { id: 1, name: 'primeiro' },
      { id: 1, name: 'segundo' },
    ];
    expect(uniqBy(items, (i) => i.id)[0].name).toBe('primeiro');
  });
});

describe('toDictionary', () => {
  it('converte array em mapa por chave', () => {
    const items = [
      { id: 'er', name: 'Elden Ring' },
      { id: 'ds3', name: 'Dark Souls III' },
    ];
    const dict = toDictionary(items, (i) => i.id);
    expect(dict['er'].name).toBe('Elden Ring');
    expect(dict['ds3'].name).toBe('Dark Souls III');
  });
});

describe('safeFind', () => {
  const items = [{ id: 1 }, { id: 2 }];

  it('retorna success quando encontra o item', () => {
    const result = safeFind(items, (i) => i.id === 1);
    expect(result).toEqual(success({ id: 1 }));
  });

  it('retorna failure quando não encontra', () => {
    const result = safeFind(items, (i) => i.id === 99);
    expect(result.isSuccess).toBe(false);
    if (!result.isSuccess) {
      expect(result.error.message).toBe('Item não encontrado.');
    }
  });
});

describe('sortBy', () => {
  const items = [{ n: 3 }, { n: 1 }, { n: 2 }];

  it('ordena em ordem crescente por padrão', () => {
    const sorted = sortBy(items, (i) => i.n);
    expect(sorted.map((i) => i.n)).toEqual([1, 2, 3]);
  });

  it('ordena em ordem decrescente', () => {
    const sorted = sortBy(items, (i) => i.n, 'desc');
    expect(sorted.map((i) => i.n)).toEqual([3, 2, 1]);
  });

  it('não muta o array original', () => {
    sortBy(items, (i) => i.n);
    expect(items[0].n).toBe(3);
  });
});

describe('chunk', () => {
  it('divide array em pedaços do tamanho certo', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('retorna array vazio se size <= 0', () => {
    expect(chunk([1, 2], 0)).toEqual([]);
  });

  it('retorna um único chunk se maior que o array', () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });
});

describe('splitBy', () => {
  it('separa itens que passam e que não passam no predicado', () => {
    const [pass, fail] = splitBy([1, 2, 3, 4], (n) => n % 2 === 0);
    expect(pass).toEqual([2, 4]);
    expect(fail).toEqual([1, 3]);
  });
});
