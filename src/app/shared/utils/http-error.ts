/**
 * O status HTTP de um erro, inclusive depois de um `resource` passar a mão nele.
 *
 * O `resource` não entrega o erro cru. O que não parece um `Error` — o que não tem `name`
 * e `message` de texto — ele embrulha num `ResourceWrappedError` e guarda o original em
 * `.cause`. `HttpErrorResponse` parece, e passa direto; qualquer outra coisa que um
 * interceptor ou um mock lance, não.
 *
 * Ler só a superfície funciona em produção e falha no primeiro erro embrulhado — que é o
 * modo de falha ruim, porque o 404 degrada para "não foi possível carregar" e a página
 * deixa de dizer que a coisa não existe. Olhar os dois lugares custa uma linha.
 */
export function statusHttp(err: unknown): number {
  const direto = (err as { status?: unknown })?.status;
  if (typeof direto === 'number') return direto;

  const causa = (err as { cause?: { status?: unknown } })?.cause?.status;
  return typeof causa === 'number' ? causa : 0;
}

/** `true` quando o recurso não existe — o caso que merece recado próprio na tela. */
export function naoEncontrado(err: unknown): boolean {
  return statusHttp(err) === 404;
}
