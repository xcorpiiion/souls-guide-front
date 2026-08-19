import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { AuthService } from '@xcorpiiion/ng-core';
import { adminGuard, ehAdmin } from './admin.guard';

function rodar(roles: string[] | null) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: { getClaim: () => roles } }],
  });

  return TestBed.runInInjectionContext(() =>
    adminGuard({} as never, { url: '/admin/moderacao' } as never),
  );
}

describe('adminGuard', () => {
  it('deixa passar quem tem ROLE_ADMIN', () => {
    expect(rodar(['ROLE_CLIENTE', 'ROLE_ADMIN'])).toBe(true);
  });

  it('manda para a home quem não tem', () => {
    const resultado = rodar(['ROLE_CLIENTE']);

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/home');
  });

  // Token sem a claim `roles` é o caso de quem não está logado.
  it('manda para a home quando o token não traz roles', () => {
    expect(rodar(null)).toBeInstanceOf(UrlTree);
  });

  describe('ehAdmin()', () => {
    it('lê a lista plana de roles do token, como a authorization-api a escreve', () => {
      const auth = { getClaim: () => ['ROLE_ADMIN'] } as unknown as AuthService;
      expect(ehAdmin(auth)).toBe(true);
    });

    it('não confunde outra role que contenha o texto', () => {
      const auth = { getClaim: () => ['ROLE_ADMINISTRATIVO'] } as unknown as AuthService;
      expect(ehAdmin(auth)).toBe(false);
    });
  });
});
