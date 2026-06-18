import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserSummary, UserPublicProfile, ActivityEvent } from '../../shared/models/user.model';
import { Page } from '../../shared/models/page.model';
import { QuestApi, QuestSummary, questApiToSummary } from '../../shared/models/quest.model';
import { LoreApi, LoreSummary, loreApiToSummary } from '../../shared/models/lore-article.model';
import { GameListItem, GameSummary, gameListItemToSummary } from '../../shared/models/game.model';

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

  getFollowingQuests(userId: number): Observable<QuestSummary[]> {
    return this.http
      .get<QuestApi[]>(`${BASE}/${userId}/following-quests`)
      .pipe(map((list) => list.map(questApiToSummary)));
  }

  getFollowingLore(userId: number): Observable<LoreSummary[]> {
    return this.http
      .get<LoreApi[]>(`${BASE}/${userId}/following-lore`)
      .pipe(map((list) => list.map(loreApiToSummary)));
  }

  getFollowingGames(userId: number): Observable<GameSummary[]> {
    return this.http
      .get<GameListItem[]>(`${BASE}/${userId}/following-games`)
      .pipe(map((list) => list.map(gameListItemToSummary)));
  }
}
