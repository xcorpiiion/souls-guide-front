import { describe, expect, it } from 'vitest';
import {
  anonimizarEmail,
  capitalizeFirstLetter,
  escapeHtml,
  normalizeNFD,
  replaceAll,
  substringToMaxSize,
} from './string-utils';

describe('replaceAll', () => {
  it('substitui todas as ocorrências', () => {
    expect(replaceAll('a.b.c', '-', '\\.')).toBe('a-b-c');
  });

  it('retorna o valor original se não há ocorrência', () => {
    expect(replaceAll('abc', '-', 'x')).toBe('abc');
  });

  it('retorna o valor original se vazio', () => {
    expect(replaceAll('', '-', '\\.')).toBe('');
  });
});

describe('capitalizeFirstLetter', () => {
  it('capitaliza a primeira letra e coloca o restante em minúsculas', () => {
    expect(capitalizeFirstLetter('elden RING')).toBe('Elden ring');
  });

  it('retorna string vazia se vazio', () => {
    expect(capitalizeFirstLetter('')).toBe('');
  });
});

describe('normalizeNFD', () => {
  it('remove acentos e caracteres especiais', () => {
    expect(normalizeNFD('Ação')).toBe('Acao');
  });
});

describe('substringToMaxSize', () => {
  it('trunca string maior que o limite', () => {
    expect(substringToMaxSize('bloodborne', 5)).toBe('blood');
  });

  it('não trunca string menor que o limite', () => {
    expect(substringToMaxSize('ER', 10)).toBe('ER');
  });

  it('não trunca string com tamanho exato', () => {
    expect(substringToMaxSize('12345', 5)).toBe('12345');
  });
});

describe('anonimizarEmail', () => {
  it('mascara usuário e domínio', () => {
    expect(anonimizarEmail('vinicius@gmail.com')).toBe('v******s@g****.com');
  });

  it('mascara usuário curto (3 chars ou menos)', () => {
    expect(anonimizarEmail('vi@gmail.com')).toBe('v*@g****.com');
  });

  it('retorna mensagem de erro se não houver @', () => {
    expect(anonimizarEmail('invalido')).toBe('Email inválido');
  });
});

describe('escapeHtml', () => {
  it('escapa caracteres HTML', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;',
    );
  });

  it('escapa &', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });
});
