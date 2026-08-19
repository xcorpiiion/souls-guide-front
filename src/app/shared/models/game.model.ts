import type { FeaturedGameDTO, GameDTO, GameSummaryDTO } from '@xcorpiiion/canonico';

// Shapes da API — fonte da verdade: lib canonico (gerada dos DTOs Java do back-end)
export type FeaturedGame = FeaturedGameDTO;

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
  genre?: string;
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
