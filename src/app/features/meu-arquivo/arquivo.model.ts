import type {
  StoryCharacterDTO,
  StoryCharacterKind,
  StoryFindingDTO,
  StoryFindingKind,
  StoryLineDTO,
  StoryLinkDTO,
  StoryLinkKind,
} from '@xcorpiiion/canonico';

/**
 * O que as duas partes do arquivo — a aba e o "montar lore" — compartilham: os
 * rótulos, e as contas que são função pura do arquivo. Nenhuma delas vai ao servidor.
 */

export interface TipoDeAchado {
  readonly key: StoryFindingKind;
  readonly label: string;
  readonly curto: string;
  readonly icon: string;
}

export interface TipoDeLigacao {
  readonly key: StoryLinkKind;
  readonly label: string;
  readonly short: string;
  readonly color: string;
  /** A única relação em que a ordem das pontas muda o sentido. */
  readonly temDirecao: boolean;
}

/** Uma fala já com o nome de quem fala, do elenco ou do rótulo. */
export interface FalaDaTela extends StoryLineDTO {
  readonly nome: string;
}

/** Um achado já com o que a tela mostra ao lado dele. */
export interface AchadoDaTela extends StoryFindingDTO {
  readonly icon: string;
  readonly typeLabel: string;
  readonly chapterLabel: string;
  readonly degree: number;
  /** Alguma ligação dele é "contradiz" — a ficha ganha o selo em brasa. */
  readonly contradiz: boolean;
  /**
   * O texto inteiro: o que a pessoa escreveu e as falas, "NOME: fala". É o que a busca procura,
   * o que a ficha resume e o que a citação da lore copia. O `body` sozinho não tem as falas
   * (ADR 0033 do souls-guide-api).
   */
  readonly texto: string;
  readonly falas: readonly FalaDaTela[];
  /** Os nomes de quem está presente, na ordem do elenco escolhido. */
  readonly presentes: readonly string[];
  readonly autor: string | null;
}

export interface TipoDeElenco {
  readonly key: StoryCharacterKind;
  readonly label: string;
  readonly icon: string;
}

/** Uma ligação lida a partir de um dos achados. */
export interface LigacaoVista {
  readonly id: number;
  readonly otherId: number;
  readonly title: string;
  readonly chapterLabel: string;
  readonly label: string;
  readonly short: string;
  readonly kind: StoryLinkKind;
  readonly why: string | null;
}

export const TIPOS: readonly TipoDeAchado[] = [
  { key: 'NOTE', label: 'nota', curto: 'nota', icon: 'ti ti-note' },
  { key: 'DOCUMENT', label: 'documento', curto: 'doc.', icon: 'ti ti-file-text' },
  { key: 'DIALOGUE', label: 'diálogo', curto: 'diálogo', icon: 'ti ti-message-dots' },
  { key: 'CUTSCENE', label: 'cutscene', curto: 'cutscene', icon: 'ti ti-movie' },
  { key: 'CREATURE', label: 'criatura', curto: 'criatura', icon: 'ti ti-spider' },
];

export const TIPOS_DE_ELENCO: readonly TipoDeElenco[] = [
  { key: 'CHARACTER', label: 'personagem', icon: 'ti ti-user' },
  { key: 'CREATURE', label: 'criatura', icon: 'ti ti-spider' },
  { key: 'BOSS', label: 'chefe', icon: 'ti ti-skull' },
];

export const ELENCO_POR_CHAVE = new Map(TIPOS_DE_ELENCO.map((t) => [t.key, t]));

/** O que cada tipo de achado usa, para o formulário e para o detalhe. */
export const USO_DO_TIPO: Readonly<
  Record<StoryFindingKind, { autor: boolean; data: boolean; presentes: boolean; falas: boolean }>
> = {
  NOTE: { autor: true, data: false, presentes: false, falas: false },
  DOCUMENT: { autor: true, data: true, presentes: false, falas: false },
  DIALOGUE: { autor: false, data: false, presentes: true, falas: true },
  CUTSCENE: { autor: false, data: false, presentes: true, falas: true },
  CREATURE: { autor: false, data: false, presentes: true, falas: false },
};

/**
 * Dourado e brasa são as únicas relações com cor própria, e é de propósito: "fala da mesma
 * pessoa" é a ligação que monta a história, e "contradiz" é a única que avisa que alguma
 * coisa está errada. As outras três são estrutura, e ficam no cinza.
 */
export const LIGACOES: readonly TipoDeLigacao[] = [
  {
    key: 'SAME_SUBJECT',
    label: 'fala da mesma pessoa/coisa',
    short: 'mesma pessoa',
    color: '#c9a84c',
    temDirecao: false,
  },
  { key: 'EXPLAINS', label: 'explica', short: 'explica', color: '#8a8278', temDirecao: false },
  {
    key: 'CONTRADICTS',
    label: 'contradiz',
    short: 'contradiz',
    color: '#b84c2a',
    temDirecao: false,
  },
  {
    key: 'HAPPENS_BEFORE',
    label: 'acontece antes',
    short: 'acontece antes',
    color: '#8a8278',
    temDirecao: true,
  },
  { key: 'MENTIONS', label: 'menciona', short: 'menciona', color: '#8a8278', temDirecao: false },
];

export const TIPO_POR_CHAVE = new Map(TIPOS.map((t) => [t.key, t]));
export const LIGACAO_POR_CHAVE = new Map(LIGACOES.map((l) => [l.key, l]));

export const SEM_CAPITULO = 'sem capítulo';

export function tipoDe(kind: StoryFindingKind): TipoDeAchado {
  return TIPO_POR_CHAVE.get(kind) ?? TIPOS[0];
}

/** Os achados com grau, selo de contradição e os nomes do elenco, na ordem em que chegaram. */
export function decorar(
  achados: StoryFindingDTO[],
  ligacoes: StoryLinkDTO[],
  elenco: readonly StoryCharacterDTO[] = [],
): AchadoDaTela[] {
  const nomes = new Map(elenco.map((c) => [c.id, c.name]));
  const grau = new Map<number, number>();
  const contradiz = new Set<number>();
  for (const l of ligacoes) {
    grau.set(l.fromId, (grau.get(l.fromId) ?? 0) + 1);
    grau.set(l.toId, (grau.get(l.toId) ?? 0) + 1);
    if (l.kind === 'CONTRADICTS') {
      contradiz.add(l.fromId);
      contradiz.add(l.toId);
    }
  }
  return achados.map((a) => {
    const tipo = tipoDe(a.kind);
    const falas = (a.lines ?? []).map((l) => ({
      ...l,
      nome: (l.characterId != null ? nomes.get(l.characterId) : null) ?? l.speaker ?? '',
    }));
    return {
      ...a,
      icon: tipo.icon,
      typeLabel: tipo.label,
      chapterLabel: a.chapter || SEM_CAPITULO,
      degree: grau.get(a.id) ?? 0,
      contradiz: contradiz.has(a.id),
      texto: textoInteiro(a.body, falas),
      falas,
      presentes: (a.characterIds ?? []).map((id) => nomes.get(id)).filter((n): n is string => !!n),
      autor: a.authorId != null ? (nomes.get(a.authorId) ?? null) : null,
    };
  });
}

/** O texto e as falas num texto só: "NOME: fala", uma por linha, depois do texto. */
export function textoInteiro(
  body: string,
  falas: readonly { nome: string; text: string }[],
): string {
  const linhas = falas.map((f) => (f.nome ? `${f.nome}: ${f.text}` : f.text));
  return [body.trim() ? body : '', linhas.join('\n')].filter(Boolean).join('\n\n');
}

/** Uma fala lida de uma conversa colada. */
export interface FalaLida {
  readonly nome: string;
  readonly texto: string;
}

/**
 * A conversa colada inteira, partida em falas pelo "NOME:" no começo da linha — o formato em
 * que quem joga costuma transcrever. Linha sem nome continua a fala anterior; antes da primeira
 * fala com nome, vira fala sem ninguém.
 *
 * <p>O nome tem de parecer nome — até 40 caracteres, sem ponto final — para "Dia 14: a menina
 * voltou" não virar a fala de alguém chamado "Dia 14". Errar para o lado de não separar é o
 * seguro: a pessoa acerta na tela, e nada se perde.
 */
export function lerConversa(texto: string): FalaLida[] {
  const falas: { nome: string; texto: string }[] = [];
  for (const bruta of texto.replace(/\r\n/g, '\n').split('\n')) {
    const linha = bruta.trim();
    if (!linha) continue;
    const m = /^([^:.!?]{1,40}):\s*(.+)$/.exec(linha);
    if (m && !/\d{1,2}$/.test(m[1].trim())) {
      falas.push({ nome: m[1].trim(), texto: m[2].trim() });
    } else if (falas.length) {
      const ultima = falas[falas.length - 1];
      ultima.texto = `${ultima.texto}\n${linha}`;
    } else {
      falas.push({ nome: '', texto: linha });
    }
  }
  return falas;
}

/**
 * As ligações de um achado, cada uma lida a partir dele.
 *
 * <p>A ligação é gravada numa direção só, e "acontece antes" é a única que muda de sentido
 * com isso: lida a partir do destino, ela é "acontece depois". Mostrar "acontece antes" dos
 * dois lados diria que cada achado veio antes do outro.
 */
export function ligacoesVistasDe(
  id: number,
  ligacoes: StoryLinkDTO[],
  porId: ReadonlyMap<number, StoryFindingDTO>,
): LigacaoVista[] {
  return ligacoes
    .filter((l) => l.fromId === id || l.toId === id)
    .map((l) => {
      const tipo = LIGACAO_POR_CHAVE.get(l.kind)!;
      const souDestino = l.toId === id;
      const invertida = souDestino && tipo.temDirecao;
      const otherId = souDestino ? l.fromId : l.toId;
      const outro = porId.get(otherId);
      return {
        id: l.id,
        otherId,
        title: outro?.title ?? '—',
        chapterLabel: outro?.chapter || SEM_CAPITULO,
        label: invertida ? 'acontece depois' : tipo.label,
        short: invertida ? 'acontece depois' : tipo.short,
        kind: l.kind,
        why: l.why ?? null,
      };
    });
}

/** Um pedaço de texto, marcado quando é o que a busca procurou. */
export interface Trecho {
  readonly texto: string;
  readonly achou: boolean;
}

/**
 * O texto partido em pedaços para a busca destacar, sem `innerHTML`.
 *
 * <p>A comparação ignora maiúscula e acento — quem busca "diario" acha "Diário" —, mas os
 * pedaços devolvidos são do texto original, com o acento de quem escreveu.
 */
export function trechos(texto: string, busca: string): Trecho[] {
  const q = normalizar(busca.trim());
  if (!q) return [{ texto, achou: false }];

  const alvo = normalizar(texto);
  const pedacos: Trecho[] = [];
  let inicio = 0;
  let achado = alvo.indexOf(q);
  while (achado !== -1) {
    if (achado > inicio) pedacos.push({ texto: texto.slice(inicio, achado), achou: false });
    pedacos.push({ texto: texto.slice(achado, achado + q.length), achou: true });
    inicio = achado + q.length;
    achado = alvo.indexOf(q, inicio);
  }
  if (inicio < texto.length) pedacos.push({ texto: texto.slice(inicio), achou: false });
  return pedacos;
}

export function contem(texto: string, busca: string): boolean {
  const q = normalizar(busca.trim());
  return !q || normalizar(texto).includes(q);
}

/**
 * O trecho da ficha: o começo do texto, ou — quando há busca e ela bate depois do começo — a
 * janela em volta da primeira ocorrência. Destacar uma palavra que o corte escondeu seria
 * dizer "está aqui" sem mostrar onde.
 */
export function janela(texto: string, busca: string, tamanho = 180): string {
  const limpo = texto.replace(/\s*\n\s*/g, ' ').trim();
  const q = normalizar(busca.trim());
  const pos = q ? normalizar(limpo).indexOf(q) : -1;
  if (pos <= tamanho - 40) {
    return limpo.length > tamanho ? `${limpo.slice(0, tamanho).trimEnd()}…` : limpo;
  }
  const comeco = Math.max(0, pos - 50);
  const fim = Math.min(limpo.length, comeco + tamanho);
  return `…${limpo.slice(comeco, fim).trim()}${fim < limpo.length ? '…' : ''}`;
}

/**
 * O título que um achado ganha quando ninguém escreveu um: a primeira linha com texto,
 * cortada numa palavra. É o que o desenho promete no campo ("vazio, o título vira a
 * primeira linha do texto"), e o servidor exige título.
 */
export function tituloDoTexto(texto: string): string {
  const linha =
    texto
      .split('\n')
      .find((l) => l.trim())
      ?.trim() ?? '';
  if (linha.length <= 80) return linha;
  const corte = linha.slice(0, 80);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > 40 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}

// ─── "Talvez ligue a" ─────────────────────────────────────────────────────────

const PALAVRAS_VAZIAS = new Set(
  (
    'para pelo pela pelos pelas como mais mas quando onde porque depois antes ainda sobre ' +
    'entre ate até desde isso isto aquilo esse essa este esta aquele aquela eles elas ' +
    'voce você voces vocês nossa nosso minha meu seus suas sua seu tudo nada cada ' +
    'muito muita pouco outra outro outros outras mesmo mesma sempre nunca tambem também ' +
    'sera será seria foram eram estava estão estao tinha tenho temos fazer feito aqui ' +
    'agora então entao assim qual quais quem dele dela deles delas numa num uma umas uns ' +
    'com sem que não nao sim dos das nos nas aos'
  ).split(' '),
);

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function palavrasDe(achado: AchadoDaTela): Set<string> {
  const texto = normalizar(`${achado.title} ${achado.texto}`);
  return new Set((texto.match(/[a-z]{4,}/g) ?? []).filter((p) => !PALAVRAS_VAZIAS.has(p)));
}

export interface Sugestao {
  readonly palavra: string;
  readonly achados: AchadoDaTela[];
}

/**
 * Achados que talvez liguem a este: os que repetem a palavra mais <b>rara</b> que ele tem
 * em comum com outros, e que ainda não estão ligados a ele.
 *
 * <p>É o único lugar em que o site opina, e ele não interpreta nada: só aponta uma palavra
 * repetida. A mais rara, e não a mais frequente, porque "porta" aparece em metade de um
 * jogo de terror e não liga nada a nada; "sino" em três achados é pista.
 */
export function sugestoesPara(
  id: number,
  achados: AchadoDaTela[],
  ligacoes: StoryLinkDTO[],
  maximo = 3,
): Sugestao | null {
  const alvo = achados.find((a) => a.id === id);
  if (!alvo) return null;

  const jaLigados = new Set<number>([id]);
  for (const l of ligacoes) {
    if (l.fromId === id) jaLigados.add(l.toId);
    if (l.toId === id) jaLigados.add(l.fromId);
  }

  const palavrasPorAchado = new Map(achados.map((a) => [a.id, palavrasDe(a)]));
  const frequencia = new Map<string, number>();
  for (const palavras of palavrasPorAchado.values()) {
    for (const p of palavras) frequencia.set(p, (frequencia.get(p) ?? 0) + 1);
  }

  const minhas = [...(palavrasPorAchado.get(id) ?? [])]
    // Palavra que só este achado tem não sugere nada; a que está em todos também não.
    .filter(
      (p) =>
        (frequencia.get(p) ?? 0) >= 2 &&
        (frequencia.get(p) ?? 0) <= Math.max(3, achados.length / 4),
    )
    .sort((a, b) => frequencia.get(a)! - frequencia.get(b)! || b.length - a.length);

  for (const palavra of minhas) {
    const candidatos = achados.filter(
      (a) => !jaLigados.has(a.id) && palavrasPorAchado.get(a.id)?.has(palavra),
    );
    if (candidatos.length) return { palavra, achados: candidatos.slice(0, maximo) };
  }
  return null;
}

// ─── Candidatos da ligação ──────────────────────────────────────────────────

/** Um achado que pode ser ligado, e por que ele aparece entre os sugeridos. */
export interface Candidato {
  readonly achado: AchadoDaTela;
  /** "cita Hinako", "mesmo capítulo", "repete 'raposa'". Vazio fora dos sugeridos. */
  readonly motivos: readonly string[];
  /** Já existe alguma ligação entre os dois (dá para ligar de novo com outra relação). */
  readonly jaLigado: boolean;
}

export interface CandidatosDaLigacao {
  readonly sugeridos: readonly Candidato[];
  /** Todos os outros, por capítulo, na ordem em que os capítulos apareceram. */
  readonly porCapitulo: readonly {
    readonly capitulo: string;
    readonly itens: readonly Candidato[];
  }[];
  readonly total: number;
}

/**
 * Quem pode ser ligado ao achado `id`: <b>todos</b> os outros, com os mais prováveis primeiro.
 *
 * <p>A folha de ligar mostrava seis achados, na ordem de registro, só com o título — com trinta
 * achados, o certo quase nunca estava lá, e para saber o que cada um dizia era preciso sair e
 * abrir. Agora:
 *
 * <ul>
 *   <li><b>sugeridos</b>: os que citam a mesma pessoa, são do mesmo capítulo ou repetem uma
 *       palavra rara do achado — cada um diz o motivo;
 *   <li>o resto, <b>por capítulo</b>, sem cortar ninguém.
 * </ul>
 *
 * <p>Busca e tipo filtram os dois. Buscando, não há sugestão: quem digita já sabe o que quer.
 */
export function candidatosDaLigacao(
  id: number,
  achados: readonly AchadoDaTela[],
  ligacoes: readonly StoryLinkDTO[],
  busca = '',
  tipo: StoryFindingKind | 'todos' = 'todos',
  maximoSugeridos = 6,
): CandidatosDaLigacao {
  const alvo = achados.find((a) => a.id === id);
  const ligados = new Set<number>();
  for (const l of ligacoes) {
    if (l.fromId === id) ligados.add(l.toId);
    if (l.toId === id) ligados.add(l.fromId);
  }

  const outros = achados
    .filter((a) => a.id !== id)
    .filter((a) => tipo === 'todos' || a.kind === tipo)
    .filter((a) => !busca.trim() || contem(`${a.title}\n${a.texto}`, busca));

  const pessoasDe = (a: AchadoDaTela) =>
    new Set(
      [...a.presentes, a.autor ?? '', ...a.falas.map((f) => f.nome)]
        .map((n) => n.trim().toLocaleLowerCase('pt-BR'))
        .filter(Boolean),
    );
  const minhasPessoas = alvo ? pessoasDe(alvo) : new Set<string>();
  const palavra = alvo && !busca.trim() ? sugestoesPara(id, [...achados], [...ligacoes], 50) : null;
  const comAPalavra = new Set(palavra?.achados.map((a) => a.id) ?? []);

  const pontuados = outros.map((a) => {
    const motivos: string[] = [];
    let pontos = 0;
    const comuns = [...pessoasDe(a)].filter((p) => minhasPessoas.has(p));
    if (comuns.length) {
      const nomes = [...a.presentes, a.autor ?? '', ...a.falas.map((f) => f.nome)].filter((n) =>
        comuns.includes(n.trim().toLocaleLowerCase('pt-BR')),
      );
      motivos.push(`cita ${[...new Set(nomes)].join(', ')}`);
      pontos += 3 * comuns.length;
    }
    if (alvo?.chapter && a.chapter === alvo.chapter) {
      motivos.push('mesmo capítulo');
      pontos += 2;
    }
    if (comAPalavra.has(a.id)) {
      motivos.push(`repete "${palavra!.palavra}"`);
      pontos += 1;
    }
    // Já ligado não some — pode ganhar outra relação —, mas não disputa lugar de sugerido.
    if (ligados.has(a.id)) pontos = 0;
    return { achado: a, motivos, pontos, jaLigado: ligados.has(a.id) };
  });

  const sugeridos = busca.trim()
    ? []
    : pontuados
        .filter((c) => c.pontos > 0)
        .sort((x, y) => y.pontos - x.pontos)
        .slice(0, maximoSugeridos);
  const jaSugerido = new Set(sugeridos.map((c) => c.achado.id));

  const grupos = new Map<string, Candidato[]>();
  for (const c of pontuados) {
    if (jaSugerido.has(c.achado.id)) continue;
    const capitulo = c.achado.chapterLabel;
    const item = { achado: c.achado, motivos: [], jaLigado: c.jaLigado };
    grupos.set(capitulo, [...(grupos.get(capitulo) ?? []), item]);
  }
  // "sem capítulo" vai por último, como na espinha: é o estado de uma página sem cabeçalho.
  const porCapitulo = [...grupos.entries()]
    .sort(([a], [b]) => Number(a === SEM_CAPITULO) - Number(b === SEM_CAPITULO))
    .map(([capitulo, itens]) => ({ capitulo, itens }));

  return {
    sugeridos: sugeridos.map(({ achado, motivos, jaLigado }) => ({ achado, motivos, jaLigado })),
    porCapitulo,
    total: outros.length,
  };
}
