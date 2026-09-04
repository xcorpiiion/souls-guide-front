import type {
  FeaturedGameDTO,
  GameDTO,
  GameFeature,
  GameGenre,
  GameSummaryDTO,
} from '@xcorpiiion/canonico';

// Enums do contrato — fonte da verdade: lib canonico
export type { GameFeature, GameGenre };

// Shapes da API — fonte da verdade: lib canonico (gerada dos DTOs Java do back-end)
export type FeaturedGame = FeaturedGameDTO;

/** Rótulo em português de cada família, para o selo do card e para o filtro. */
export const GAME_GENRE_LABEL: Record<GameGenre, string> = {
  SOULS_LIKE: 'souls-like',
  SURVIVAL_HORROR: 'survival horror',
  ACTION_HORROR: 'terror de ação',
  PSYCHOLOGICAL_HORROR: 'terror psicológico',
  OTHER: 'outro',
};

/**
 * Os gêneros que viram chip no filtro.
 *
 * `OTHER` fica de fora de propósito: é o estado de jogo recém-cadastrado, ainda sem
 * família declarada, e "mostre-me os jogos sem gênero" não é pergunta que alguém faz.
 */
export const GAME_GENRE_FILTERS: GameGenre[] = [
  'SOULS_LIKE',
  'SURVIVAL_HORROR',
  'PSYCHOLOGICAL_HORROR',
  'ACTION_HORROR',
];

/**
 * O sufixo da classe CSS que pinta o selo e a faixa do card.
 *
 * Sai daqui, e não de um `toLowerCase()` no rótulo, porque o rótulo é texto de tela:
 * trocar 'terror de ação' por 'ação/terror' não pode mudar a cor do card em silêncio.
 */
export const GAME_GENRE_CLASS: Record<GameGenre, string> = {
  SOULS_LIKE: 'souls',
  SURVIVAL_HORROR: 'survival',
  ACTION_HORROR: 'action',
  PSYCHOLOGICAL_HORROR: 'psycho',
  OTHER: 'other',
};

// DTO retornado por GET /games/{id}
export type Game = GameDTO;

// DTO retornado por GET /games (lista paginada) — GameSummaryDTO do back-end
export type GameListItem = GameSummaryDTO;

// Shape usado nas listagens e cards do front
export interface GameSummary {
  /** O que vai na URL: o slug quando existe, o id quando não. */
  ref: string;
  /** Endereço legível na URL. Ausente em conteúdo criado antes da migração V34. */
  slug?: string | null;
  id: string;
  name: string;
  shortName: string;
  accentClass: string;
  /** A família do jogo. Nunca ausente: jogo sem gênero declarado é `OTHER`. */
  genre: GameGenre;
  /**
   * O que o jogo declara ter — e, por consequência, que seções a página dele mostra.
   *
   * Ausente na listagem, de propósito: `GameSummaryDTO` não carrega o campo, porque o
   * card do catálogo não abre seção nenhuma. Quem lê isto é `temCapacidade`, nunca o
   * campo cru — é lá que mora a regra da ausência.
   */
  features?: GameFeature[];
  /**
   * Se o jogo cabe na promessa do site.
   *
   * O catálogo é amplo no banco e estreito no site: a sincronização com a IGDB importa
   * qualquer jogo, para a biblioteca do usuário se apoiar nele, mas só o do escopo é
   * conteúdo. Fora dele a página é ficha mínima — sem aba nenhuma, porque `features` vem
   * vazio, e com `noindex`.
   *
   * Ausente na listagem pelo mesmo motivo que `features`: `GameSummaryDTO` não carrega o
   * campo, e não precisa — `GET /games` já devolve só os do escopo. Ver ADR 0027 do
   * souls-guide-api.
   */
  dentroDoEscopo?: boolean;
  /** A série, quando o jogo pertence a alguma. Lies of P não pertence a nenhuma. */
  seriesName?: string | null;
  seriesSlug?: string | null;
  questCount: number;
  loreCount: number;
  followersCount: number;
  userIsFollowing?: boolean;
  contributorsCount: number;
  topQuestTitle: string | null;
  topQuestSteps: number | null;
  topQuestFollowers: number | null;
  lastActivityLabel: string;
  imageUrl?: string;
  description?: string;
}

// kept for backwards compatibility with mocks/specs
export type GameDetailData = GameSummary & {
  developer?: string;
  releaseYear?: number;
  quests: import('./quest.model').QuestSummary[];
  featuredLore: import('./lore-article.model').LoreSummary[];
};

export function gameListItemToSummary(g: GameListItem): GameSummary {
  return {
    id: String(g.id),
    ref: g.slug ?? String(g.id),
    slug: g.slug,
    name: g.name,
    shortName: g.shortName,
    accentClass: g.accentClass,
    genre: g.genre,
    seriesName: g.seriesName,
    seriesSlug: g.seriesSlug,
    questCount: g.questCount,
    loreCount: g.loreCount,
    followersCount: g.followersCount,
    userIsFollowing: g.userIsFollowing,
    contributorsCount: g.contributorsCount,
    topQuestTitle: g.topQuestTitle ?? null,
    topQuestSteps: g.topQuestSteps ?? null,
    topQuestFollowers: g.topQuestFollowers ?? null,
    lastActivityLabel: g.lastActivityLabel,
  };
}

// Mantido para compatibilidade com user.service (getFollowingGames usa Game do detail)
export function gameToSummary(g: Game): GameSummary {
  return {
    id: String(g.id),
    ref: g.slug ?? String(g.id),
    slug: g.slug,
    name: g.name,
    shortName: g.name.split(' ')[0],
    accentClass: 'accent-default',
    genre: g.genre,
    features: g.features,
    dentroDoEscopo: g.dentroDoEscopo,
    seriesName: g.series?.name ?? null,
    seriesSlug: g.series?.slug ?? null,
    questCount: 0,
    loreCount: 0,
    followersCount: g.followerCount ?? 0,
    userIsFollowing: g.userIsFollowing ?? false,
    contributorsCount: 0,
    topQuestTitle: null,
    topQuestSteps: null,
    topQuestFollowers: null,
    lastActivityLabel: '—',
    imageUrl: g.imageUrl,
    description: g.description,
  };
}

/**
 * O jogo tem esta capacidade — ou seja, a página dele abre esta seção?
 *
 * **A resposta não sai do conteúdo cadastrado**, e é essa a regra inteira. Mostrar a aba
 * de finais porque existe final gravado fecha justamente a porta que ela deveria abrir:
 * Silent Hill 2 tem finais múltiplos e nenhum cadastrado ainda, e derivando ficaria
 * **para sempre** sem a aba, sem ninguém ter por onde escrever o primeiro. A capacidade é
 * uma afirmação sobre o jogo, não uma contagem de linhas (ADR 0019).
 *
 * **Conjunto ausente responde `true` para tudo**, e não `false`. O back garante que jogo
 * nenhum é gravado sem capacidade nenhuma (`beforeSave`), então ausência aqui só pode ser
 * o `GameSummaryDTO` da listagem, que não carrega o campo — nunca "este jogo não tem
 * nada". Erra para o lado de mostrar demais, que se corrige pela tela de edição, em vez
 * de esconder, que não.
 */
export function temCapacidade(g: GameSummary | null, f: GameFeature): boolean {
  if (!g) return false;
  return !g.features?.length || g.features.includes(f);
}

/**
 * Quantos seguidores, encurtado.
 *
 * 15600 vira '15.6k' porque o card tem três números lado a lado e o do meio não pode
 * empurrar os outros para fora quando um jogo popular entra na lista.
 */
export function seguidoresLabel(total: number): string {
  return total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);
}
