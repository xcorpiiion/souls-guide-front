import type {
  StoryFindingDTO,
  StoryFindingKind,
  StoryLinkDTO,
  StoryLinkKind,
} from '@xcorpiiion/canonico';

/**
 * O que as três partes do arquivo — a aba, o mural e o "montar lore" — compartilham: os
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

/** Um achado já com o que a tela mostra ao lado dele. */
export interface AchadoDaTela extends StoryFindingDTO {
  readonly icon: string;
  readonly typeLabel: string;
  readonly chapterLabel: string;
  readonly degree: number;
  /** Alguma ligação dele é "contradiz" — a ficha ganha o selo em brasa. */
  readonly contradiz: boolean;
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
];

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

/** Os achados com grau e selo de contradição, na ordem em que chegaram. */
export function decorar(achados: StoryFindingDTO[], ligacoes: StoryLinkDTO[]): AchadoDaTela[] {
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
    return {
      ...a,
      icon: tipo.icon,
      typeLabel: tipo.label,
      chapterLabel: a.chapter || SEM_CAPITULO,
      degree: grau.get(a.id) ?? 0,
      contradiz: contradiz.has(a.id),
    };
  });
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

function palavrasDe(achado: StoryFindingDTO): Set<string> {
  const texto = normalizar(`${achado.title} ${achado.body}`);
  return new Set((texto.match(/[a-z]{4,}/g) ?? []).filter((p) => !PALAVRAS_VAZIAS.has(p)));
}

export interface Sugestao {
  readonly palavra: string;
  readonly achados: StoryFindingDTO[];
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
  achados: StoryFindingDTO[],
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
