export type LoreStatus = 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';

export interface LoreSummary {
  id: string;
  title: string;
  gameId: string;
  gameName: string;
  status: LoreStatus;
  votes: number;
  excerpt: string;
}
