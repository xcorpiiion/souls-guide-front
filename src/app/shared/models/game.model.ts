export interface FeaturedGame {
  id: number;
  name: string;
  shortName: string;
  questCount: number;
  loreCount: number;
}

// DTO retornado por GET /games/{id}
export interface Game {
  id: number;
  name: string;
  imageUrl: string;
  description: string;
  followerCount: number;
  userIsFollowing: boolean;
}

// DTO retornado por GET /games (lista paginada) — GameSummaryDTO do back-end
export interface GameListItem {
  id: number;
  name: string;
  imageUrl: string;
  description: string;
  followersCount: number;
  userIsFollowing: boolean;
  questCount: number;
  loreCount: number;
  contributorsCount: number;
  topQuestTitle: string | null;
  topQuestSteps: number | null;
  topQuestFollowers: number | null;
  lastActivityLabel: string;
}

// Shape usado nas listagens e cards do front
export interface GameSummary {
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
    name: g.name,
    shortName: g.name.split(' ')[0],
    accentClass: 'accent-default',
    questCount: g.questCount,
    loreCount: g.loreCount,
    followersCount: g.followersCount,
    userIsFollowing: g.userIsFollowing,
    contributorsCount: g.contributorsCount,
    topQuestTitle: g.topQuestTitle,
    topQuestSteps: g.topQuestSteps,
    topQuestFollowers: g.topQuestFollowers,
    lastActivityLabel: g.lastActivityLabel,
    imageUrl: g.imageUrl,
    description: g.description,
  };
}

// Mantido para compatibilidade com user.service (getFollowingGames usa Game do detail)
export function gameToSummary(g: Game): GameSummary {
  return {
    id: String(g.id),
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
