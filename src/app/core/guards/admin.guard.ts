import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@xcorpiiion/ng-core';

/** As roles do token, como a authorization-api as escreve: lista plana em `ROLE_*`. */
export function ehAdmin(auth: AuthService): boolean {
  return (auth.getClaim<string[]>('roles') ?? []).includes('ROLE_ADMIN');
}

/**
 * Fecha a rota de moderação para quem não é admin.
 *
 * O guard é conveniência de navegação, não segurança: quem decide é o
 * `@PreAuthorize("hasRole('ADMIN')")` do servidor, e ele continua valendo para quem
 * chamar a API direto. Sem o guard, o não-admin veria a tela montar e cada chamada
 * responder 403 — o que parece defeito, e não recusa.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (ehAdmin(auth)) return true;

  return router.createUrlTree(['/home']);
};
