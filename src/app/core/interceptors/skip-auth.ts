import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marca uma requisição que não deve receber o header Authorization.
 *
 * Existe por causa do upload: os bytes vão direto para uma URL assinada do bucket, que
 * não é nossa. Mandar o JWT para lá o entregaria a um terceiro, e a assinatura cobre os
 * cabeçalhos — um header a mais pode simplesmente invalidar a URL.
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

export function skipAuth(): HttpContext {
  return new HttpContext().set(SKIP_AUTH, true);
}
