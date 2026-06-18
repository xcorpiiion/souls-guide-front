export type ConditionEffect = 'HIDE' | 'REVEAL' | 'FORCE_ENDING';

export interface QuestConditionApi {
  id: number;
  gameId: number;
  triggerNodeIds: string[];
  affectedQuestId: number;
  affectedQuestTitle: string;
  effect: ConditionEffect;
  endingNodeId: string | null;
  description: string;
  isSpoiler: boolean;
}

export interface QuestCondition {
  id: string;
  gameId: string;
  triggerNodeIds: string[];
  affectedQuestId: string;
  affectedQuestTitle: string;
  effect: ConditionEffect;
  endingNodeId: string | null;
  description: string;
  isSpoiler: boolean;
}

export interface QuestConditionRequest {
  triggerNodeIds: string[];
  affectedQuestId: number;
  effect: ConditionEffect;
  endingNodeId?: string | null;
  description: string;
  isSpoiler: boolean;
}

export function questConditionApiToModel(c: QuestConditionApi): QuestCondition {
  return {
    id: String(c.id),
    gameId: String(c.gameId),
    triggerNodeIds: c.triggerNodeIds,
    affectedQuestId: String(c.affectedQuestId),
    affectedQuestTitle: c.affectedQuestTitle,
    effect: c.effect,
    endingNodeId: c.endingNodeId,
    description: c.description,
    isSpoiler: c.isSpoiler,
  };
}
