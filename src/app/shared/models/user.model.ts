import type { ActivityItem, UserPublicProfileDTO, UserSummaryDTO } from '@xcorpiiion/canonico';

// Shapes da API — fonte da verdade: lib canonico
export type UserSummary = UserSummaryDTO;

export type UserPublicProfile = UserPublicProfileDTO;

// ActivityItem do canonico, com narrowing dos discriminadores usados pelo front
export interface ActivityEvent extends ActivityItem {
  type: 'created' | 'updated' | 'followed_user';
  targetKind: 'quest' | 'lore' | 'user';
}
