export type LoreStatus = 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';
export type LoreCategory = 'NPC' | 'LOCACAO' | 'ITEM' | 'EVENTO' | 'TEORIA';

export interface LoreSummary {
  id: string;
  title: string;
  gameId: string;
  gameName: string;
  category: LoreCategory;
  status: LoreStatus;
  excerpt: string;
  votes: number;
  author: string;
  readMinutes: number;
  tags: string[];
}

export interface LoreSection {
  heading: string;
  body: string;
  quote?: string;
}

export interface LoreRelatedQuest {
  questId: string;
  gameId: string;
  title: string;
}

export interface LoreArticle extends LoreSummary {
  sections: LoreSection[];
  relatedQuests: LoreRelatedQuest[];
}
