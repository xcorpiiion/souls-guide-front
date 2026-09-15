/**
 * O que uma listagem mostra de uma lore sem abrir o artigo: o primeiro parágrafo escrito, a
 * primeira citação e quantas citações ela tem.
 *
 * <p>O resumo antigo era {@code content.slice(0, 120)}, e o conteúdo é markdown: a listagem
 * mostrava {@code > Se você ler isto… — Bilhete dobrado · nota, Cap. 1 — …}, com o sinal de
 * citação e a linha de origem colados no meio. Uma lore montada com o arquivo (ADR 0008 do
 * front) começa quase sempre por uma citação, e o resumo virava só isso.
 *
 * <p>Função pura e sem dependência, de propósito: o modelo de lore a chama no de-para, e um
 * import de serviço aqui arrastaria o núcleo para dentro de {@code shared/models}.
 */

export interface CitacaoDaLore {
  readonly trecho: string;
  /** "Bilhete dobrado no armário · nota, Cap. 1", sem o travessão da linha de origem. */
  readonly origem: string;
}

export interface ResumoDaLore {
  readonly paragrafo: string;
  readonly citacoes: number;
  readonly citacao: CitacaoDaLore | null;
}

export function resumoDaLore(conteudo: string, tamanho = 220): ResumoDaLore {
  const blocos = (conteudo ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  let paragrafo = '';
  let citacao: CitacaoDaLore | null = null;
  let citacoes = 0;

  for (const bloco of blocos) {
    if (bloco.startsWith('>')) {
      citacoes++;
      if (!citacao) citacao = lerCitacao(bloco);
      continue;
    }
    // Imagem e título não resumem nada; o primeiro parágrafo de verdade é o que vale.
    if (!paragrafo && !/^!\[/.test(bloco) && !/^#{1,6}\s/.test(bloco)) {
      paragrafo = semMarkdown(bloco);
    }
  }

  return { paragrafo: cortar(paragrafo, tamanho), citacoes, citacao };
}

function lerCitacao(bloco: string): CitacaoDaLore {
  const linhas = bloco.split('\n');
  const temOrigem = linhas.length > 1 && linhas[linhas.length - 1].startsWith('— ');
  const origem = temOrigem ? linhas.pop()!.slice(2).trim() : '';
  const trecho = linhas.map((l) => l.replace(/^>\s?/, '')).join(' ');
  return { trecho: cortar(semMarkdown(trecho), 160), origem };
}

function semMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^- /gm, '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

function cortar(texto: string, tamanho: number): string {
  if (texto.length <= tamanho) return texto;
  const corte = texto.slice(0, tamanho);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > tamanho * 0.6 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}
