export type NotificationType =
  | 'QUEST_LIKE'
  | 'LORE_LIKE'
  | 'COMMENT_LIKE'
  | 'COMMENT_ON_QUEST'
  | 'COMMENT_ON_LORE'
  | 'REPLY_TO_COMMENT'
  | 'QUEST_NEW_VERSION'
  | 'LORE_NEW_VERSION'
  | 'GAME_NEW_QUEST'
  | 'GAME_NEW_LORE'
  | 'USER_FOLLOW';

export interface Notification {
  id: number;
  type: NotificationType;
  actorId: string;
  actorName: string;
  targetType: 'QUEST' | 'LORE' | 'COMMENT' | 'USER';
  targetId: number;
  targetTitle: string | null;
  read: boolean;
  createdAt: string;
}
