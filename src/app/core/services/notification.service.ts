import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import { Notification } from '../../shared/models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(HttpService).resource('notifications');

  getNotifications(page: number): Observable<Notification[]> {
    return this.api.get<Notification[]>('', { page });
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.api.get<{ count: number }>('unread-count');
  }

  markOneRead(notificationId: number): Observable<void> {
    return this.api.post<void>(`${notificationId}/read`);
  }

  markAllRead(): Observable<void> {
    return this.api.post<void>('read-all');
  }
}
