import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { naoEncontrado, statusHttp } from './http-error';

describe('statusHttp', () => {
  it('lê o status de um HttpErrorResponse', () => {
    expect(statusHttp(new HttpErrorResponse({ status: 404 }))).toBe(404);
  });

  it('lê o status de um objeto solto', () => {
    expect(statusHttp({ status: 500 })).toBe(500);
  });

  /**
   * O caso que motivou a função.
   *
   * O `resource` embrulha o que não parece `Error` e põe o original em `.cause`. Sem
   * olhar lá, o 404 vira 0 e a página troca "não encontrado" por "não foi possível
   * carregar" — erro certo, recado errado.
   */
  it('lê o status de dentro do .cause, como o resource entrega', () => {
    const embrulhado = new Error('Resource returned an error', { cause: { status: 404 } });
    expect(statusHttp(embrulhado)).toBe(404);
  });

  it('devolve 0 para o que não tem status em lugar nenhum', () => {
    expect(statusHttp(new Error('rede caiu'))).toBe(0);
    expect(statusHttp(null)).toBe(0);
    expect(statusHttp(undefined)).toBe(0);
    expect(statusHttp('erro')).toBe(0);
  });

  it('naoEncontrado só é verdade no 404', () => {
    expect(naoEncontrado({ status: 404 })).toBe(true);
    expect(naoEncontrado({ status: 403 })).toBe(false);
    expect(naoEncontrado(new Error('x'))).toBe(false);
  });
});
