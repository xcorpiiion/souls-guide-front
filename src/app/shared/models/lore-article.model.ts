export type LoreStatus = 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';
export type LoreCategory = 'NPC' | 'LOCACAO' | 'ITEM' | 'EVENTO' | 'TEORIA';

// Shape retornado pela API
export interface LoreApi {
  id: number;
  title: string;
  content: string;
  status: LoreStatus;
  userId: string;
  gameId: number;
  gameName: string;
  items: { id: number; name: string; description: string }[];
}

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

export function loreApiToSummary(l: LoreApi): LoreSummary {
  return {
    id: String(l.id),
    title: l.title,
    gameId: String(l.gameId),
    gameName: l.gameName,
    category: 'TEORIA',
    status: l.status,
    excerpt: l.content.slice(0, 120) + (l.content.length > 120 ? '…' : ''),
    votes: 0,
    author: l.userId ?? '—',
    readMinutes: Math.max(1, Math.ceil(l.content.split(' ').length / 200)),
    tags: l.items.map((i) => i.name),
  };
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
