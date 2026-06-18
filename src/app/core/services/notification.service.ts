import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../../shared/models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}/notifications`;

  getNotifications(page: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.base, { params: { page } });
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`);
  }

  markOneRead(notificationId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${notificationId}/read`, null);
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.base}/read-all`, null);
  }
}
