export type QuestStatus = 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';
export type QuestNodeType = 'start' | 'end' | 'task' | 'gateway' | 'external-quest';
export type QuestEndingType = 'positive' | 'tragic' | 'neutral';

// Shape retornado pela API
export interface QuestApi {
  id: number;
  title: string;
  description: string;
  userId: string;
  gameId: number;
  gameName: string;
}

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
  description?: string | null;
}

export function questApiToSummary(q: QuestApi): QuestSummary {
  return {
    id: String(q.id),
    title: q.title,
    description: q.description,
    gameId: String(q.gameId),
    gameName: q.gameName,
    stepCount: 0,
    forkCount: 0,
    endingCount: 0,
    status: 'TEORIA',
    followers: 0,
    author: q.userId ?? null,
  };
}

export interface QuestNode {
  id: string;
  type: QuestNodeType;
  label: string;
  sublabel?: string | null;
  description?: string | null;
  location?: string | null;
  tags?: string[];
  endingType?: QuestEndingType | null;
  linkedQuestId?: string | null;
  linkedQuestName?: string | null;
  linkedNodeLabel?: string | null;
}

export interface QuestEdge {
  id: string;
  from: string;
  to: string;
  label?: string | null;
}

export interface QuestRelatedLink {
  questId: string;
  questTitle: string;
  npcInitials: string;
  crossingNodeLabel: string;
}

export interface QuestDetailData extends QuestSummary {
  nodes: QuestNode[];
  edges: QuestEdge[];
  relatedQuests: QuestRelatedLink[];
}
