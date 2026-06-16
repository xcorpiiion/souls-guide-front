import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserSummary, UserPublicProfile, ActivityEvent } from '../../shared/models/user.model';
import { Page } from '../../shared/models/page.model';

const BASE = `${environment.apis.soulsGuide}/users`;

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  listUsers(q = '', page = 0, size = 20, gameId?: string): Observable<Page<UserSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q) params = params.set('q', q);
    if (gameId) params = params.set('gameId', gameId);
    return this.http.get<Page<UserSummary>>(BASE, { params });
  }

  getByHandle(handle: string): Observable<UserPublicProfile> {
    return this.http.get<UserPublicProfile>(`${BASE}/handle/${handle}`);
  }

  getFollowers(userId: number): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${BASE}/${userId}/followers`);
  }

  getFollowing(userId: number): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${BASE}/${userId}/following`);
  }

  follow(userId: number): Observable<void> {
    return this.http.post<void>(`${BASE}/${userId}/follow`, null);
  }

  unfollow(userId: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${userId}/follow`);
  }

  getActivity(userId: string): Observable<ActivityEvent[]> {
    return this.http.get<ActivityEvent[]>(`${BASE}/${userId}/activity`);
  }
}
