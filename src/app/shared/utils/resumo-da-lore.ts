/**
 * O que uma listagem mostra de uma lore sem abrir o artigo: o primeiro parágrafo escrito, a
 * primeira citação, quantas citações ela tem e quem ela cita.
 *
 * <p>O resumo antigo era {@code content.slice(0, 120)}, e o conteúdo é markdown: a listagem
 * mostrava {@code > Se você ler isto… — Bilhete dobrado · nota, Cap. 1 — …}, com o sinal de
 * citação e a linha de origem colados no meio. Uma lore montada com o arquivo (ADR 0008 do
 * front) começa quase sempre por uma citação, e o resumo virava só isso.
 *
 * <p>Função pura e sem dependência de serviço, de propósito: o modelo de lore a chama no de-para,
 * e um import de serviço aqui arrastaria o núcleo para dentro de {@code shared/models}.
 */
import { TipoDaCitacao, lerCitacao, semRepetir, separarOrigem } from './citacao-da-lore';

export interface CitacaoDaLore {
  readonly trecho: string;
  /** "Bilhete dobrado no armário · nota, Cap. 1", sem o travessão da linha de origem. */
  readonly origem: string;
  readonly tipo: TipoDaCitacao | null;
  readonly titulo: string;
}

export interface ResumoDaLore {
  readonly paragrafo: string;
  readonly citacoes: number;
  readonly citacao: CitacaoDaLore | null;
  /** Quem a lore cita — o "sobre quem" que substituiu mundo/personagem (ADR 0011). */
  readonly pessoas: readonly string[];
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
  const pessoas: string[] = [];

  for (const bloco of blocos) {
    if (bloco.startsWith('>')) {
      citacoes++;
      const { trecho, origem } = separarOrigem(bloco);
      const lida = lerCitacao(trecho, origem);
      pessoas.push(...lida.pessoas);
      if (!citacao) {
        citacao = {
          trecho: cortar(semMarkdown(trecho), 160),
          origem,
          tipo: lida.tipo,
          titulo: lida.titulo,
        };
      }
      continue;
    }
    // Imagem e título não resumem nada; o primeiro parágrafo de verdade é o que vale.
    if (!paragrafo && !/^!\[/.test(bloco) && !/^#{1,6}\s/.test(bloco)) {
      paragrafo = semMarkdown(bloco);
    }
  }

  return { paragrafo: cortar(paragrafo, tamanho), citacoes, citacao, pessoas: semRepetir(pessoas) };
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
