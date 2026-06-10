import { describe, expect, it } from 'vitest';
import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
  const pipe = new TruncatePipe();

  it('retorna string vazia para null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('retorna string vazia para undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('não trunca string dentro do limite', () => {
    expect(pipe.transform('Elden Ring', 20)).toBe('Elden Ring');
  });

  it('não trunca string com tamanho exato', () => {
    expect(pipe.transform('12345', 5)).toBe('12345');
  });

  it('trunca e adiciona ellipsis padrão', () => {
    expect(pipe.transform('bloodborne', 5)).toBe('blood...');
  });

  it('usa ellipsis customizado', () => {
    expect(pipe.transform('bloodborne', 5, ' →')).toBe('blood →');
  });

  it('usa limite padrão de 100', () => {
    const longa = 'a'.repeat(101);
    expect(pipe.transform(longa)).toBe('a'.repeat(100) + '...');
  });
});
