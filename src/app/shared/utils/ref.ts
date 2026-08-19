/**
 * O endereço legível de um conteúdo na URL, e o caminho de volta dele para o id.
 *
 * O formato é `45-ranni-a-bruxa`: o id na frente, o slug depois. Não é enfeite — é o que
 * torna a URL legível **sem** criar ambiguidade. Slug puro exigiria que ele fosse único no
 * escopo da rota, e dois guias com o mesmo título em jogos diferentes é o caso normal, não
 * a exceção.
 *
 * Com o id na frente, a resolução é sempre exata, a URL diz do que a página trata, e o link
 * antigo — só o id — continua funcionando sem redirect.
 */

/**
 * Monta a referência a partir do id e do slug.
 *
 * Sem slug, devolve só o id: conteúdo criado antes da migração pode não ter um, e a URL
 * continua válida.
 */
export function refDe(id: string | number, slug?: string | null): string {
  return slug ? `${id}-${slug}` : String(id);
}

/**
 * Extrai o id de uma referência.
 *
 * Aceita as três formas que podem chegar pela URL: `45`, `45-ranni-a-bruxa` e — no caso do
 * jogo, cujo endpoint resolve slug de verdade — `elden-ring`, que devolve o texto intacto
 * para o servidor resolver.
 */
export function paraId(ref: string): string {
  const so = /^(\d+)(?:-.*)?$/.exec(ref);
  return so ? so[1] : ref;
}
