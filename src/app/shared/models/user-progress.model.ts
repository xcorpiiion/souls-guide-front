import type { UserProgressDTO, UserProgressResponse } from '@xcorpiiion/canonico';

// UserProgressResponse (questId/completedNodeIds) + contadores do UserProgressDTO
export type UserProgress = UserProgressResponse &
  Partial<Pick<UserProgressDTO, 'totalNodes' | 'completedNodes'>>;
