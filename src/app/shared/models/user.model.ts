export interface UserSummary {
  id: number;
  name: string;
  handle: string;
  bio: string | null;
  questCount: number;
  loreCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  favoriteGame: string | null;
}

export interface ActivityEvent {
  type: 'created' | 'updated' | 'followed_user';
  targetTitle: string | null;
  targetId: string;
  targetKind: 'quest' | 'lore' | 'user';
  occurredAt: string;
  daysAgo: number;
}

export interface UserPublicProfile {
  id: number;
  name: string;
  handle: string;
  bio: string | null;
  joinedLabel: string;
  questCount: number;
  loreCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}
