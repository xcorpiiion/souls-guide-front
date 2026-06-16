export interface FeaturedGame {
  id: number;
  name: string;
  shortName: string;
  questCount: number;
  loreCount: number;
}

export interface Game {
  id: number;
  name: string;
  imageUrl: string;
  description: string;
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

export function gameToSummary(g: Game): GameSummary {
  return {
    id: String(g.id),
    name: g.name,
    shortName: g.name.split(' ')[0],
    accentClass: 'accent-default',
    questCount: 0,
    loreCount: 0,
    followersCount: 0,
    contributorsCount: 0,
    topQuestTitle: null,
    topQuestSteps: null,
    topQuestFollowers: null,
    lastActivityLabel: '—',
    imageUrl: g.imageUrl,
    description: g.description,
  };
}
