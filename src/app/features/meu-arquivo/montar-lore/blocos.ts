import { AchadoDaTela, SEM_CAPITULO, tipoDe } from '../arquivo.model';

/**
 * O texto de uma lore montada: parágrafos e citações, na ordem de leitura.
 *
 * <p>Há dois tipos de citação, e a diferença é de onde vem o texto:
 *
 * <ul>
 *   <li><b>`citacao`</b> — escolhida agora, do arquivo. O texto sai do achado na hora de salvar;
 *   <li><b>`fixa`</b> — já estava num artigo salvo. O texto é o que foi copiado para ele, e não
 *       volta a ler o achado: editar o achado depois não muda uma lore que outras pessoas já
 *       leram (ADR 0007).
 * </ul>
 */
export type Bloco =
  | { readonly id: number; readonly kind: 'texto'; readonly valor: string }
  | { readonly id: number; readonly kind: 'citacao'; readonly achadoId: number }
  | {
      readonly id: number;
      readonly kind: 'fixa';
      readonly trecho: string;
      readonly origem: string;
    };

/** A linha de baixo da citação: de onde o trecho veio. */
export function origemDe(a: AchadoDaTela): string {
  return `— ${a.title} · ${tipoDe(a.kind).label}, ${a.chapter || SEM_CAPITULO}`;
}

/**
 * Linha em branco dentro do texto de um achado vira quebra simples: no markdown do site, linha
 * em branco separa blocos, e ela partiria a citação em duas.
 */
function corpoDaCitacao(texto: string): string {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

/** O markdown do artigo. É o que o servidor guarda, e o que a página do artigo desenha. */
export function serializar(
  blocos: readonly Bloco[],
  porId: ReadonlyMap<number, AchadoDaTela>,
): string {
  return blocos
    .map((b) => {
      if (b.kind === 'texto') return b.valor.trim();
      if (b.kind === 'fixa') {
        const corpo = `> ${corpoDaCitacao(b.trecho)}`;
        return b.origem ? `${corpo}\n${b.origem}` : corpo;
      }
      const a = porId.get(b.achadoId);
      return a ? `> ${corpoDaCitacao(a.body)}\n${origemDe(a)}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * O caminho de volta: o markdown de um artigo salvo, em blocos para editar.
 *
 * <p>Todo bloco que começa com `> ` é citação, e a última linha dele, se começar com `— `, é a
 * origem. O resto vira parágrafo — e parágrafos vizinhos ficam num bloco só, com a linha em
 * branco entre eles. Sem isso, um artigo antigo escrito à mão, sem citação nenhuma, abriria
 * como vinte caixas de texto soltas.
 *
 * <p>Nada se perde na volta: título com `##`, lista e imagem continuam no texto do parágrafo,
 * como estavam.
 */
export function lerBlocos(conteudo: string, proximoId: () => number): Bloco[] {
  const pedacos = conteudo
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocos: Bloco[] = [];
  let texto: string[] = [];
  const fecharTexto = () => {
    if (texto.length) blocos.push({ id: proximoId(), kind: 'texto', valor: texto.join('\n\n') });
    texto = [];
  };

  for (const pedaco of pedacos) {
    if (!pedaco.startsWith('>')) {
      texto.push(pedaco);
      continue;
    }
    fecharTexto();
    const linhas = pedaco.split('\n');
    const temOrigem = linhas.length > 1 && linhas[linhas.length - 1].startsWith('— ');
    const origem = temOrigem ? linhas.pop()! : '';
    const trecho = linhas.map((l) => l.replace(/^>\s?/, '')).join('\n');
    blocos.push({ id: proximoId(), kind: 'fixa', trecho, origem });
  }
  fecharTexto();

  // A escrita sempre termina num parágrafo: é onde a pessoa continua.
  if (blocos[blocos.length - 1]?.kind !== 'texto') {
    blocos.push({ id: proximoId(), kind: 'texto', valor: '' });
  }
  return blocos;
}

/** Tirar uma citação do meio deixaria dois parágrafos colados; eles viram um só. */
export function juntarTextosVizinhos(lista: readonly Bloco[]): Bloco[] {
  const resultado: Bloco[] = [];
  for (const b of lista) {
    const anterior = resultado[resultado.length - 1];
    if (b.kind === 'texto' && anterior?.kind === 'texto') {
      const valor = [anterior.valor.trim(), b.valor.trim()].filter(Boolean).join('\n\n');
      resultado[resultado.length - 1] = { ...anterior, valor };
    } else {
      resultado.push(b);
    }
  }
  return resultado.length ? resultado : [{ id: 1, kind: 'texto', valor: '' }];
}
