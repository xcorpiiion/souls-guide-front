/**
 * Conteúdo de lore: markdown com imagens embutidas.
 *
 * As imagens no meio do texto são escritas como `![alt](file:<fileKey>)` — chave, não
 * URL. As URLs da storage-api são assinadas e expiram, então gravar uma delas dentro do
 * texto produziria um artigo que funciona hoje e mostra imagem quebrada semana que vem.
 * Quem exibe troca a chave pela URL no momento de renderizar.
 */
import { IMAGENS_DE_USUARIO_HABILITADAS } from '../../core/services/storage.service';

const IMAGE_BLOCK = /^!\[([^\]]*)\]\(file:([^)\s]+)\)$/;

export type LoreBlock =
  | { kind: 'heading'; text: string }
  /** `origem` é a linha "— Título · tipo, capítulo" que o montar lore põe embaixo do trecho. */
  | { kind: 'quote'; text: string; origem?: string }
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

/**
 * Quebra o texto em blocos tipados, do jeito que a tela de leitura consome.
 *
 * <p>Com imagem desligada, o bloco de imagem não vira um espaço vazio na leitura: ele
 * simplesmente não é produzido. O texto do artigo continua inteiro — só a imagem sai.
 */
export function parseLoreContent(content: string): LoreBlock[] {
  return splitBlocks(content)
    .map((block): LoreBlock | null => {
      const image = IMAGE_BLOCK.exec(block);
      if (image) {
        return IMAGENS_DE_USUARIO_HABILITADAS
          ? { kind: 'image', alt: image[1], fileKey: image[2] }
          : null;
      }
      if (block.startsWith('## ')) return { kind: 'heading', text: block.slice(3) };
      if (block.startsWith('>')) return lerCitacao(block);
      return { kind: 'paragraph', text: block };
    })
    .filter((block): block is LoreBlock => block !== null);
}

/**
 * A citação, com o trecho e a origem separados. Cada linha perde o `> `, e a última — quando
 * começa com travessão — é de onde o trecho veio. Sem separar, a origem saía na leitura como
 * mais uma linha do texto do jogo.
 */
function lerCitacao(bloco: string): LoreBlock {
  const linhas = bloco.split('\n');
  const temOrigem = linhas.length > 1 && linhas[linhas.length - 1].startsWith('— ');
  const origem = temOrigem ? linhas.pop()!.slice(2).trim() : '';
  const text = linhas.map((l) => l.replace(/^>\s?/, '')).join('\n');
  return origem ? { kind: 'quote', text, origem } : { kind: 'quote', text };
}

function splitBlocks(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

/**
 * Um pedaço de parágrafo: texto puro, negrito, itálico ou link.
 *
 * <p>A página de leitura renderiza cada pedaço com `{{ }}`, que o Angular escapa. É por isso
 * que isto devolve <b>segmentos</b> e não HTML: o texto da lore é escrito por usuário e a
 * página é pública, então `innerHTML` — mesmo com sanitizer — seria uma superfície de XSS
 * aberta por conveniência. Aqui não há como injetar marcação: o que não casa com uma das
 * três marcas sai como texto.
 */
export type InlineSegment =
  | { kind: 'texto'; text: string }
  | { kind: 'forte'; text: string }
  | { kind: 'enfase'; text: string }
  | { kind: 'link'; text: string; href: string };

// `**forte**` vem antes de `*enfase*` na alternância, senão o itálico come o primeiro
// asterisco do negrito e sobra um par solto.
const INLINE = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;

/** Quebra um parágrafo em segmentos, preservando a ordem e o texto que não é marcação. */
export function parseInline(text: string): InlineSegment[] {
  const segmentos: InlineSegment[] = [];
  let fim = 0;

  for (const m of text.matchAll(INLINE)) {
    if (m.index > fim) segmentos.push({ kind: 'texto', text: text.slice(fim, m.index) });

    if (m[1] !== undefined) {
      const href = enderecoSeguro(m[2]);
      // Endereço recusado não vira link nem some: volta como o texto que a pessoa escreveu,
      // para ela ver o que digitou em vez de perder o trecho.
      segmentos.push(href ? { kind: 'link', text: m[1], href } : { kind: 'texto', text: m[0] });
    } else if (m[3] !== undefined) {
      segmentos.push({ kind: 'forte', text: m[3] });
    } else {
      segmentos.push({ kind: 'enfase', text: m[4] });
    }

    fim = m.index + m[0].length;
  }

  if (fim < text.length) segmentos.push({ kind: 'texto', text: text.slice(fim) });
  return juntarTexto(segmentos);
}

/**
 * Só `http` e `https` viram link.
 *
 * <p>Recusar por allowlist, e não por lista de proibidos: `javascript:` é o caso conhecido,
 * mas `data:` e qualquer esquema que um navegador venha a registrar caem na mesma armadilha,
 * e a lista de proibidos envelhece sozinha. Endereço relativo também fica de fora — a lore é
 * texto, não navegação interna.
 */
function enderecoSeguro(url: string): string | null {
  const limpo = url.trim();
  if (!/^https?:\/\//i.test(limpo)) return null;
  try {
    new URL(limpo);
    return limpo;
  } catch {
    return null;
  }
}

/**
 * Junta segmentos de texto vizinhos num só.
 *
 * <p>Eles aparecem quando um link é recusado: o endereço volta como texto e encosta no
 * texto que já vinha ao lado. Sem juntar, `[x](javascript:alert(1))` sairia partido em
 * dois pedaços — a leitura é a mesma, mas o segmento deixa de corresponder ao que a
 * pessoa escreveu, e é isso que o teste da allowlist verifica.
 */
function juntarTexto(segmentos: InlineSegment[]): InlineSegment[] {
  return segmentos.reduce<InlineSegment[]>((acc, seg) => {
    const anterior = acc[acc.length - 1];
    if (seg.kind === 'texto' && anterior?.kind === 'texto') {
      acc[acc.length - 1] = { kind: 'texto', text: anterior.text + seg.text };
      return acc;
    }
    acc.push(seg);
    return acc;
  }, []);
}
