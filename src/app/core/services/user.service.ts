import { Injectable, inject } from '@angular/core';
import { HttpService, Page } from '@xcorpiiion/ng-core';
import { map, Observable } from 'rxjs';
import { UserSummary, UserPublicProfile, ActivityEvent } from '../../shared/models/user.model';
import { QuestApi, QuestSummary, questApiToSummary } from '../../shared/models/quest.model';
import { LoreApi, LoreSummary, loreApiToSummary } from '../../shared/models/lore-article.model';
import { GameListItem, GameSummary, gameListItemToSummary } from '../../shared/models/game.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  // `users` na souls-guide-api, que é a base default — não confundir com a
  // user-api, que é outra base e responde por perfil e conta (ver
  // ProfileService).
  private readonly api = inject(HttpService).resource('users');

  listUsers(q = '', page = 0, size = 20, gameId?: string): Observable<Page<UserSummary>> {
    return this.api.page<UserSummary>('', { page, size, q, gameId });
  }

  getByHandle(handle: string): Observable<UserPublicProfile> {
    return this.api.get<UserPublicProfile>(`handle/${handle}`);
  }

  getFollowers(userId: string): Observable<UserSummary[]> {
    return this.api.get<UserSummary[]>(`${userId}/followers`);
  }

  getFollowing(userId: string): Observable<UserSummary[]> {
    return this.api.get<UserSummary[]>(`${userId}/following`);
  }

  follow(userId: string): Observable<void> {
    return this.api.post<void>(`${userId}/follow`);
  }

  unfollow(userId: string): Observable<void> {
    return this.api.delete<void>(`${userId}/follow`);
  }

  getActivity(userId: string): Observable<ActivityEvent[]> {
    return this.api.get<ActivityEvent[]>(`${userId}/activity`);
  }

  getFollowingQuests(userId: string): Observable<QuestSummary[]> {
    return this.api
      .get<QuestApi[]>(`${userId}/following-quests`)
      .pipe(map((list) => list.map(questApiToSummary)));
  }

  getFollowingLore(userId: string): Observable<LoreSummary[]> {
    return this.api
      .get<LoreApi[]>(`${userId}/following-lore`)
      .pipe(map((list) => list.map(loreApiToSummary)));
  }

  getFollowingGames(userId: string): Observable<GameSummary[]> {
    return this.api
      .get<GameListItem[]>(`${userId}/following-games`)
      .pipe(map((list) => list.map(gameListItemToSummary)));
  }
}
