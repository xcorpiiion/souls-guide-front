export type ConditionEffect = 'HIDE' | 'REVEAL' | 'FORCE_ENDING';

export interface QuestConditionApi {
  id: number;
  gameId: number;
  triggerNodeIds: string[];
  /** IDs dos nós afetados (HIDE / REVEAL). Null quando efeito é FORCE_ENDING. */
  affectedNodeIds: string[] | null;
  /** Usado apenas para efeito FORCE_ENDING. */
  affectedQuestId: number | null;
  affectedQuestTitle: string | null;
  /** Título da quest que possui os nós gatilho. */
  triggerQuestTitle: string | null;
  /** ID da quest que possui os nós gatilho. */
  triggerQuestId: number | null;
  /** Labels dos nós afetados (HIDE/REVEAL), paralelo a affectedNodeIds. */
  affectedNodeLabels: string[] | null;
  effect: ConditionEffect;
  endingNodeId: string | null;
  description: string;
  isSpoiler: boolean;
}

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

export interface QuestConditionRequest {
  triggerNodeIds: string[];
  /** IDs dos nós afetados (HIDE / REVEAL). Null para FORCE_ENDING. */
  affectedNodeIds: string[] | null;
  /** Sempre obrigatório: quest dos nós afetados (HIDE/REVEAL) ou quest do final travado (FORCE_ENDING). */
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
    affectedNodeIds: c.affectedNodeIds ?? [],
    affectedQuestId: c.affectedQuestId != null ? String(c.affectedQuestId) : null,
    affectedQuestTitle: c.affectedQuestTitle,
    triggerQuestTitle: c.triggerQuestTitle ?? null,
    triggerQuestId: c.triggerQuestId != null ? String(c.triggerQuestId) : null,
    affectedNodeLabels: c.affectedNodeLabels ?? [],
    effect: c.effect,
    endingNodeId: c.endingNodeId,
    description: c.description,
    isSpoiler: c.isSpoiler,
  };
}
