/**
 * O que o navegador tem e o Node não, para o bundle de servidor não morrer no import.
 *
 * O `@xcorpiiion/ng-core` lê `localStorage` direto, sem guarda de plataforma — é lá que
 * o token da sessão mora. Como o `AuthService.isLoggedIn()` é chamado pela navbar, que
 * está em todas as páginas, a primeira renderização de servidor estouraria
 * `ReferenceError: localStorage is not defined` **em todas as rotas**.
 *
 * A correção definitiva é a lib guardar o acesso (`isPlatformBrowser`) e é onde isto
 * deveria morar. Enquanto ela não sai, este arquivo dá ao servidor um armazenamento que
 * **não guarda nada**: `getItem` devolve null e `setItem` não escreve.
 *
 * Isso não é preguiça, é o comportamento correto para SSR: quem renderiza no servidor é
 * uma requisição sem sessão — um crawler, ou o primeiro acesso de alguém —, e o HTML
 * gerado é público. Um armazenamento de verdade, compartilhado pelo processo, faria a
 * sessão de um visitante vazar para o HTML servido ao seguinte.
 */
const vazio: Storage = {
  length: 0,
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};

const alvo = globalThis as unknown as Record<string, unknown>;

if (typeof alvo['localStorage'] === 'undefined') alvo['localStorage'] = vazio;
if (typeof alvo['sessionStorage'] === 'undefined') alvo['sessionStorage'] = vazio;
