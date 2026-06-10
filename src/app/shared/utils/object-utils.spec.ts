import { describe, expect, it, vi } from 'vitest';
import { deepClone, debounce, getAllAsNonNull, isEmpty, isNull, pick, pluck } from './object-utils';

describe('isNull', () => {
  it('retorna true para null', () => expect(isNull(null)).toBe(true));
  it('retorna true para undefined', () => expect(isNull(undefined)).toBe(true));
  it('retorna false para 0', () => expect(isNull(0)).toBe(false));
  it('retorna false para string vazia', () => expect(isNull('')).toBe(false));
});

describe('isEmpty', () => {
  it('retorna true para null/undefined', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });

  it('retorna true para string vazia', () => expect(isEmpty('')).toBe(true));
  it('retorna true para array vazio', () => expect(isEmpty([])).toBe(true));
  it('retorna true para objeto vazio', () => expect(isEmpty({})).toBe(true));
  it('retorna false para string com conteúdo', () => expect(isEmpty('elden')).toBe(false));
  it('retorna false para array com itens', () => expect(isEmpty([1])).toBe(false));
  it('retorna false para objeto com chaves', () => expect(isEmpty({ a: 1 })).toBe(false));
});

describe('deepClone', () => {
  it('clona objeto sem referência compartilhada', () => {
    const original = { a: { b: 1 } };
    const clone = deepClone(original);
    clone.a.b = 99;
    expect(original.a.b).toBe(1);
  });

  it('clona arrays corretamente', () => {
    const original = [{ id: 1 }, { id: 2 }];
    const clone = deepClone(original);
    clone[0].id = 99;
    expect(original[0].id).toBe(1);
  });

  it('retorna primitivos diretamente', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('bloodborne')).toBe('bloodborne');
  });
});

describe('getAllAsNonNull', () => {
  it('remove chaves com valores nulos ou vazios', () => {
    const result = getAllAsNonNull({ name: 'Ranni', desc: '', tags: null as unknown as string });
    expect(result).toEqual({ name: 'Ranni' });
  });

  it('faz trim em strings', () => {
    const result = getAllAsNonNull({ name: '  Blaidd  ' });
    expect(result).toEqual({ name: 'Blaidd' });
  });
});

describe('pluck', () => {
  it('extrai a propriedade de cada item', () => {
    const games = [
      { id: 'er', name: 'Elden Ring' },
      { id: 'ds3', name: 'Dark Souls III' },
    ];
    expect(pluck(games, 'name')).toEqual(['Elden Ring', 'Dark Souls III']);
  });
});

describe('pick', () => {
  it('retorna apenas as propriedades indicadas', () => {
    const game = { id: 'er', name: 'Elden Ring', shortName: 'ER' };
    expect(pick(game, 'id', 'name')).toEqual({ id: 'er', name: 'Elden Ring' });
  });
});

describe('debounce', () => {
  it('chama a função apenas uma vez após o delay', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
