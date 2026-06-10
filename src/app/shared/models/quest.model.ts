export type QuestStatus = 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';

export interface QuestSummary {
  id: string;
  title: string;
  gameId: string;
  gameName: string;
  stepCount: number;
  forkCount: number;
  endingCount: number;
  status: QuestStatus;
  followers: number;
  author: string | null;
}
