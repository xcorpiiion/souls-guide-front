export type QuestStatus = 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';
export type QuestNodeType = 'start' | 'end' | 'task' | 'gateway' | 'external-quest';
export type QuestEndingType = 'positive' | 'tragic' | 'neutral';
export type QuestNodeStatus = 'VISIVEL' | 'BLOQUEADA';

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
  /** Backend envia por nó para usuários autenticados. Ausente = VISIVEL. */
  status?: QuestNodeStatus;
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
  npcInitials: string | null;
  crossingNodeLabel: string;
}

// Shape retornado pela API em GET /quests, GET /quests/{id}
export interface QuestApi {
  id: number;
  title: string;
  description: string;
  status: QuestStatus;
  userId: string;
  gameId: number;
  gameName: string;
  nodes: QuestNode[];
  edges: QuestEdge[];
  relatedQuests: QuestRelatedLink[];
  // campos de conteúdo de perfil
  isPersonal: boolean;
  ownerId: string | null;
  isOwner: boolean;
  isPublic: boolean;
  allowCopy: boolean;
  likeCount: number;
  userHasLiked: boolean;
  followerCount: number;
  userIsFollowing: boolean;
  stepCount?: number;
  forkCount?: number;
  endingCount?: number;
  // condições entre quests
  /** true somente quando TODOS os nós da quest estão bloqueados. */
  hidden?: boolean;
  hiddenReason?: string | null;
  hiddenIsSpoiler?: boolean;
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

export interface FollowResponse {
  followerCount: number;
  userIsFollowing: boolean;
}

export function questApiToSummary(q: QuestApi): QuestSummary {
  return {
    id: String(q.id),
    title: q.title,
    description: q.description,
    gameId: String(q.gameId),
    gameName: q.gameName,
    stepCount: q.stepCount ?? q.nodes?.filter((n) => n.type === 'task').length ?? 0,
    forkCount: q.forkCount ?? q.nodes?.filter((n) => n.type === 'gateway').length ?? 0,
    endingCount: q.endingCount ?? q.nodes?.filter((n) => n.type === 'end').length ?? 0,
    status: q.status ?? 'TEORIA',
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
