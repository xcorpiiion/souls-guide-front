export type LoreStatus = 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';
export type LoreCategory = 'WORLD' | 'CHARACTER';

// Shape retornado pela API
export interface LoreApi {
  id: number;
  title: string;
  content: string;
  status: LoreStatus;
  type: 'WORLD' | 'CHARACTER';
  characterName: string | null;
  tags: string[];
  userId: string;
  gameId: number;
  gameName: string;
  items: { id: number; name: string; description: string }[];
  // campos de conteúdo de perfil
  isPersonal: boolean;
  ownerId: string | null;
  isPublic: boolean;
  allowCopy: boolean;
  likeCount: number;
  userHasLiked: boolean;
  followerCount: number;
  userIsFollowing: boolean;
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
  // campos de conteúdo de perfil
  isPersonal?: boolean;
  ownerId?: string;
  ownerNickname?: string;
  isPublic?: boolean;
  allowCopy?: boolean;
  likeCount?: number;
  userHasLiked?: boolean;
  followerCount?: number;
  userIsFollowing?: boolean;
}

export function loreApiToSummary(l: LoreApi): LoreSummary {
  return {
    id: String(l.id),
    title: l.title,
    gameId: String(l.gameId),
    gameName: l.gameName,
    category: l.type === 'CHARACTER' ? 'CHARACTER' : 'WORLD',
    status: l.status,
    excerpt: l.content.slice(0, 120) + (l.content.length > 120 ? '…' : ''),
    votes: l.likeCount ?? 0,
    author: l.userId ?? '—',
    readMinutes: Math.max(1, Math.ceil(l.content.split(' ').length / 200)),
    tags: l.tags?.length ? l.tags : l.items.map((i) => i.name),
    isPersonal: l.isPersonal ?? false,
    ownerId: l.ownerId ?? undefined,
    isPublic: l.isPublic ?? true,
    allowCopy: l.allowCopy ?? false,
    likeCount: l.likeCount ?? 0,
    userHasLiked: l.userHasLiked ?? false,
    followerCount: l.followerCount ?? 0,
    userIsFollowing: l.userIsFollowing ?? false,
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
