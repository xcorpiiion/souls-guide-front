/**
 * Conteúdo de lore: markdown com imagens embutidas.
 *
 * As imagens no meio do texto são escritas como `![alt](file:<fileKey>)` — chave, não
 * URL. As URLs da storage-api são assinadas e expiram, então gravar uma delas dentro do
 * texto produziria um artigo que funciona hoje e mostra imagem quebrada semana que vem.
 * Quem exibe troca a chave pela URL no momento de renderizar.
 */

const IMAGE_BLOCK = /^!\[([^\]]*)\]\(file:([^)\s]+)\)$/;

export type LoreBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'image'; fileKey: string; alt: string }
  | { kind: 'paragraph'; text: string };

/** Markdown a inserir no texto para referenciar um arquivo já enviado. */
export function loreImageMarkdown(fileKey: string, alt = ''): string {
  return `![${alt}](file:${fileKey})`;
}

/** Todas as chaves citadas no corpo do texto, para resolver de uma vez só. */
export function extractImageFileKeys(content: string): string[] {
  return splitBlocks(content)
    .map((block) => IMAGE_BLOCK.exec(block)?.[2])
    .filter((key): key is string => !!key);
}

/** Quebra o texto em blocos tipados, do jeito que a tela de leitura consome. */
export function parseLoreContent(content: string): LoreBlock[] {
  return splitBlocks(content).map((block) => {
    const image = IMAGE_BLOCK.exec(block);
    if (image) return { kind: 'image', alt: image[1], fileKey: image[2] };
    if (block.startsWith('## ')) return { kind: 'heading', text: block.slice(3) };
    if (block.startsWith('> ')) return { kind: 'quote', text: block.slice(2) };
    return { kind: 'paragraph', text: block };
  });
}

/**
 * HTML do preview do editor. `resolved` mapeia chave → URL; uma chave que ainda não
 * resolveu vira um marcador, e não uma imagem quebrada.
 */
export function renderMarkdown(md: string, resolved?: ReadonlyMap<string, string>): string {
  return md
    .replace(/^!\[([^\]]*)\]\(file:([^)\s]+)\)$/gm, (_, alt: string, key: string) => {
      const url = resolved?.get(key);
      return url
        ? `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" />`
        : `<p class="lore-image-pending">imagem enviando…</p>`;
    })
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hbup])/gm, '')
    .trim();
}

function splitBlocks(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
