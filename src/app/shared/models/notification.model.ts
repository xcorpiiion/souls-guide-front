import type {
  NotificationResponse,
  NotificationType as CanonicoNotificationType,
} from '@xcorpiiion/canonico';

// Enum do contrato — fonte da verdade: lib canonico
export type NotificationType = CanonicoNotificationType;

// NotificationResponse do canonico, com narrowing do targetType usado pelo front
export interface Notification extends NotificationResponse {
  targetType: 'QUEST' | 'LORE' | 'COMMENT' | 'USER';
}
