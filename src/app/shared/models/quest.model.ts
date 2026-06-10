export type QuestStatus = 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';
export type QuestNodeType = 'start' | 'end' | 'task' | 'gateway' | 'external-quest';
export type QuestEndingType = 'positive' | 'tragic' | 'neutral';

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
  description: string;
  nodes: QuestNode[];
  edges: QuestEdge[];
  relatedQuests: QuestRelatedLink[];
}
