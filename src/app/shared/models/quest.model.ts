import type { QuestEdgeDTO, QuestGuideDTO, QuestNodeDTO } from '@xcorpiiion/canonico';
import { refDe } from '../utils/ref';

// Enums do contrato — fonte da verdade: lib canonico
export type { FollowResponse } from '@xcorpiiion/canonico';

// Narrowings do front sobre campos que o back-end tipa como string
export type QuestNodeType = 'start' | 'end' | 'task' | 'gateway' | 'external-quest';
export type QuestEndingType = 'positive' | 'tragic' | 'neutral';
export type QuestNodeStatus = 'VISIVEL' | 'BLOQUEADA';

export interface QuestNode extends Omit<
  QuestNodeDTO,
  'type' | 'endingType' | 'status' | 'linkedQuestId'
> {
  type: QuestNodeType;
  endingType?: QuestEndingType | null;
  /** Backend envia por nó para usuários autenticados. Ausente = VISIVEL. */
  status?: QuestNodeStatus;
  linkedQuestId?: string | null;
  linkedNodeLabel?: string | null;
}

export interface QuestEdge extends Omit<QuestEdgeDTO, 'id'> {
  id: string;
}

export interface QuestRelatedLink {
  questId: string;
  questTitle: string;
  npcInitials: string | null;
  crossingNodeLabel: string;
}

// Shape retornado pela API em GET /quests, GET /quests/{id}
// Base: QuestGuideDTO do canonico; campos de detalhe presentes só em GET /quests/{id}
export interface QuestApi extends QuestGuideDTO {
  npcName?: string | null;
  isOwner?: boolean;
  nodes?: QuestNode[];
  edges?: QuestEdge[];
  relatedQuests?: QuestRelatedLink[];
}

export interface QuestSummary {
  /**
   * O que vai na URL: `45-ranni-a-bruxa`. Montado no mapper para o template não precisar
   * saber como se monta um endereço — ver shared/utils/ref.ts.
   */
  ref: string;
  /** Endereço legível na URL. Ausente em conteúdo criado antes da migração V34. */
  slug?: string | null;
  id: string;
  title: string;
  gameId: string;
  gameName: string;
  npcName?: string | null;
  stepCount: number;
  forkCount: number;
  endingCount: number;
  followers: number;
  author: string | null;
  description?: string | null;
  // campos de conteúdo de perfil
  isPersonal?: boolean;
  ownerId?: string;
  isOwner?: boolean;
  ownerNickname?: string;
  isPublic?: boolean;
  allowCopy?: boolean;
  likeCount?: number;
  userHasLiked?: boolean;
  followerCount?: number;
  userIsFollowing?: boolean;
  // condições entre quests
  hidden?: boolean;
  hiddenReason?: string | null;
  hiddenIsSpoiler?: boolean;
}

export function questApiToSummary(q: QuestApi): QuestSummary {
  return {
    id: String(q.id),
    ref: refDe(q.id, q.slug),
    slug: q.slug,
    title: q.title,
    description: q.description,
    gameId: String(q.gameId),
    gameName: q.gameName,
    npcName: q.npcName ?? null,
    stepCount: q.stepCount ?? q.nodes?.filter((n) => n.type === 'task').length ?? 0,
    forkCount: q.forkCount ?? q.nodes?.filter((n) => n.type === 'gateway').length ?? 0,
    endingCount: q.endingCount ?? q.nodes?.filter((n) => n.type === 'end').length ?? 0,
    followers: q.followerCount ?? 0,
    author: q.userId ?? null,
    isPersonal: q.isPersonal ?? false,
    ownerId: q.ownerId ?? undefined,
    isOwner: q.isOwner ?? false,
    isPublic: q.isPublic ?? true,
    allowCopy: q.allowCopy ?? false,
    likeCount: q.likeCount ?? 0,
    userHasLiked: q.userHasLiked ?? false,
    followerCount: q.followerCount ?? 0,
    userIsFollowing: q.userIsFollowing ?? false,
    hidden: q.hidden ?? false,
    hiddenReason: q.hiddenReason ?? null,
    hiddenIsSpoiler: q.hiddenIsSpoiler ?? true,
  };
}

export interface QuestDetailData extends QuestSummary {
  nodes: QuestNode[];
  edges: QuestEdge[];
  relatedQuests: QuestRelatedLink[];
}
