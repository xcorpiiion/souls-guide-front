import type {
  ConditionEffect as CanonicoConditionEffect,
  QuestConditionDTO,
  QuestConditionRequest as CanonicoQuestConditionRequest,
} from '@xcorpiiion/canonico';

// Enum do contrato — fonte da verdade: lib canonico
export type ConditionEffect = CanonicoConditionEffect;

// Shapes da API — QuestConditionDTO / QuestConditionRequest do canonico
export type QuestConditionApi = QuestConditionDTO;
export type QuestConditionRequest = CanonicoQuestConditionRequest;

// View model do front (ids como string)
export interface QuestCondition {
  id: string;
  gameId: string;
  triggerNodeIds: string[];
  affectedNodeIds: string[];
  /** Presente apenas quando effect === 'FORCE_ENDING'. */
  affectedQuestId: string | null;
  affectedQuestTitle: string | null;
  /** Título da quest que possui os nós gatilho. */
  triggerQuestTitle: string | null;
  /** ID da quest que possui os nós gatilho. */
  triggerQuestId: string | null;
  /** Labels dos nós afetados (HIDE/REVEAL), paralelo a affectedNodeIds. */
  affectedNodeLabels: string[];
  effect: ConditionEffect;
  endingNodeId: string | null;
  description: string;
  isSpoiler: boolean;
}

export function questConditionApiToModel(c: QuestConditionApi): QuestCondition {
  return {
    id: String(c.id),
    gameId: String(c.gameId),
    triggerNodeIds: c.triggerNodeIds,
    affectedNodeIds: c.affectedNodeIds ?? [],
    affectedQuestId: c.affectedQuestId != null ? String(c.affectedQuestId) : null,
    affectedQuestTitle: c.affectedQuestTitle ?? null,
    triggerQuestTitle: c.triggerQuestTitle ?? null,
    triggerQuestId: c.triggerQuestId != null ? String(c.triggerQuestId) : null,
    affectedNodeLabels: c.affectedNodeLabels ?? [],
    effect: c.effect,
    endingNodeId: c.endingNodeId ?? null,
    description: c.description,
    isSpoiler: c.isSpoiler,
  };
}
