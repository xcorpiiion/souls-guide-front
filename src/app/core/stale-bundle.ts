/**
 * Recupera a aba que ficou aberta durante um deploy.
 *
 * O Angular carrega cada rota por `import()` dinâmico, e o nome de cada chunk
 * carrega um hash do conteúdo. Quando um deploy sobe, os chunks antigos deixam
 * de existir no servidor — mas quem já está com a página aberta continua com o
 * `main.js` velho na memória, apontando para eles. Na primeira navegação, o
 * import falha com 404 e a tela simplesmente não troca, sem erro visível.
 *
 * Não dá para consertar isso no servidor: o `main.js` que está rodando já foi
 * baixado. O único caminho é recarregar, que traz o index.html novo — e ele não
 * é cacheado, justamente por isso.
 *
 * A trava no sessionStorage existe porque, se o recarregamento cair de novo num
 * bundle quebrado, o par erro-recarrega vira laço infinito. Uma tentativa por
 * aba; se não resolveu, o problema é outro e o erro precisa aparecer.
 */
const TENTOU = 'sg_recarregou_por_chunk';

/** O texto varia por navegador; nenhum deles expõe um código para isso. */
export function isChunkLoadError(erro: unknown): boolean {
  const msg = erro instanceof Error ? `${erro.name} ${erro.message}` : String(erro);
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
}

export function recarregarSeBundleVelho(erro: unknown): boolean {
  if (!isChunkLoadError(erro)) return false;

  try {
    if (sessionStorage.getItem(TENTOU)) return false;
    sessionStorage.setItem(TENTOU, '1');
  } catch {
    // Sem sessionStorage não há como travar o laço; melhor não recarregar.
    return false;
  }

  location.reload();
  return true;
}

/** Chamado depois que a aplicação sobe inteira: a aba está sã de novo. */
export function limparMarcaDeRecarga(): void {
  try {
    sessionStorage.removeItem(TENTOU);
  } catch {
    // nada a fazer
  }
}
