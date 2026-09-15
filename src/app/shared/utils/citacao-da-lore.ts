/**
 * Ler de volta uma citação de lore: de que tipo de achado ela veio, quem fala em cada linha e
 * quem aparece. Ver ADR 0011 do front.
 *
 * <h2>O formato</h2>
 * Quem escreve é o "montar lore" ({@code features/meu-arquivo/montar-lore/blocos.ts}), como
 * bloco de citação do markdown que o site já guarda:
 *
 * <pre>
 * > MULHER DE BRANCO: Você já esteve aqui.
 * JAMES: Nunca estive.
 * — Conversa na ponte · diálogo, Cap. 2 · com Mulher de branco, James
 * </pre>
 *
 * <p>A última linha é a <b>origem</b>: título, tipo, capítulo, e — desde este ADR — quem
 * aparece ({@code com}) ou quem escreveu ({@code por}). Lore publicada antes disso não tem essa
 * parte, e continua lida: sem ela, os nomes saem só das falas.
 *
 * <p>O texto continua sendo markdown, e não um formato novo no servidor: o artigo já guardava a
 * citação como cópia (ADR 0007), e o que faltava era a leitura saber separar as peças.
 */

export type TipoDaCitacao = 'nota' | 'documento' | 'diálogo' | 'cutscene' | 'criatura';

export interface FalaCitada {
  readonly nome: string;
  readonly texto: string;
}

export interface CitacaoLida {
  readonly tipo: TipoDaCitacao | null;
  readonly titulo: string;
  readonly capitulo: string;
  /** O texto que não é fala: a nota, o documento, a descrição da cena. */
  readonly texto: string;
  /** As falas, só em diálogo e cutscene. */
  readonly falas: readonly FalaCitada[];
  /** Quem aparece, escreveu ou fala — sem repetir, na ordem em que surgem. */
  readonly pessoas: readonly string[];
}

export const ICONE_DO_TIPO: Readonly<Record<TipoDaCitacao, string>> = {
  nota: 'ti ti-note',
  documento: 'ti ti-file-text',
  diálogo: 'ti ti-message-dots',
  cutscene: 'ti ti-movie',
  criatura: 'ti ti-spider',
};

const TIPOS = new Set<string>(Object.keys(ICONE_DO_TIPO));

/** `trecho` é o corpo sem os `> `; `origem` é a última linha sem o travessão. */
export function lerCitacao(trecho: string, origem: string): CitacaoLida {
  const partes = origem
    .split(' · ')
    .map((p) => p.trim())
    .filter(Boolean);

  const titulo = partes[0] ?? '';
  const [tipoBruto, ...capitulo] = (partes[1] ?? '').split(', ');
  const tipo = TIPOS.has(tipoBruto) ? (tipoBruto as TipoDaCitacao) : null;

  const declaradas: string[] = [];
  for (const extra of partes.slice(2)) {
    const m = /^(com|por)\s+(.+)$/.exec(extra);
    if (m)
      declaradas.push(
        ...m[2]
          .split(', ')
          .map((n) => n.trim())
          .filter(Boolean),
      );
  }

  const comFalas = tipo === 'diálogo' || tipo === 'cutscene';
  const falas: FalaCitada[] = [];
  const texto: string[] = [];
  for (const bruta of trecho.split('\n')) {
    const linha = bruta.trim();
    if (!linha) continue;
    // Só onde há fala: numa nota, "Dia 14: a menina voltou" é texto, e não alguém chamado Dia 14.
    const m = comFalas ? /^([^:.!?]{1,40}):\s*(.+)$/.exec(linha) : null;
    if (m && !/\d{1,2}$/.test(m[1].trim())) {
      falas.push({ nome: m[1].trim(), texto: m[2].trim() });
    } else if (falas.length && comFalas) {
      const ultima = falas.pop()!;
      falas.push({ ...ultima, texto: `${ultima.texto}\n${linha}` });
    } else {
      texto.push(linha);
    }
  }

  return {
    tipo,
    titulo,
    capitulo: capitulo.join(', '),
    texto: texto.join('\n'),
    falas,
    pessoas: semRepetir([...declaradas, ...falas.map((f) => f.nome)]),
  };
}

/**
 * Toda citação de um texto de lore inteiro, na ordem em que aparecem. Sem passar pelo
 * `lore-content`: o resumo das listagens usa isto no de-para do modelo, e aquele arquivo puxa
 * serviço junto.
 */
export function citacoesDaLore(conteudo: string): CitacaoLida[] {
  return (conteudo ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.startsWith('>'))
    .map((bloco) => {
      const { trecho, origem } = separarOrigem(bloco);
      return lerCitacao(trecho, origem);
    });
}

/** O bloco `> …` em corpo sem os `> ` e a linha de origem sem o travessão. */
export function separarOrigem(bloco: string): { trecho: string; origem: string } {
  const linhas = bloco.split('\n');
  const temOrigem = linhas.length > 1 && linhas[linhas.length - 1].startsWith('— ');
  const origem = temOrigem ? linhas.pop()!.slice(2).trim() : '';
  return { trecho: linhas.map((l) => l.replace(/^>\s?/, '')).join('\n'), origem };
}

/** Quem a lore cita, sem repetir: é o "sobre quem" que substituiu mundo/personagem. */
export function pessoasDaLore(conteudo: string): string[] {
  return semRepetir(citacoesDaLore(conteudo).flatMap((c) => c.pessoas));
}

/** Nomes iguais com maiúscula diferente são a mesma pessoa; fica a primeira grafia. */
export function semRepetir(nomes: readonly string[]): string[] {
  const vistos = new Map<string, string>();
  for (const n of nomes) {
    const chave = n.trim().toLocaleLowerCase('pt-BR');
    if (chave && !vistos.has(chave)) vistos.set(chave, n.trim());
  }
  return [...vistos.values()];
}

/** A mesma comparação, para saber se uma citação cita alguém. */
export function citaPessoa(c: CitacaoLida, nome: string): boolean {
  const alvo = nome.trim().toLocaleLowerCase('pt-BR');
  return c.pessoas.some((p) => p.toLocaleLowerCase('pt-BR') === alvo);
}
