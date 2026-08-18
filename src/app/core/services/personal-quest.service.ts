import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { map, Observable } from 'rxjs';
import {
  QuestApi,
  QuestSummary,
  QuestStatus,
  questApiToSummary,
} from '../../shared/models/quest.model';

export interface CreatePersonalQuestRequest {
  title: string;
  description?: string;
  gameId: number;
  status?: QuestStatus;
  coverImageFileKey?: string;
  isPublic: boolean;
  allowCopy: boolean;
}

export interface UpdatePersonalQuestRequest {
  title?: string;
  description?: string;
  status?: QuestStatus;
  coverImageFileKey?: string;
  isPublic?: boolean;
  allowCopy?: boolean;
}

export interface LikeResponse {
  likeCount: number;
  userHasLiked: boolean;
}

export interface CopyToProfileRequest {
  replaceExistingId?: number;
}

export interface CopyConflict {
  conflictingId: number;
  conflictingTitle: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PersonalQuestService {
  // A raiz da souls-guide-api: este service atravessa `quests`, `users` e
  // `games`, então o recurso é a base e o caminho vai inteiro na chamada.
  private readonly api = inject(HttpService).resource('');

  createPersonal(data: CreatePersonalQuestRequest): Observable<QuestApi> {
    return this.api.post<QuestApi>('quests/personal', data);
  }

  listByUser(userId: string): Observable<QuestSummary[]> {
    return this.api
      .get<QuestApi[]>(`users/${userId}/quests`)
      .pipe(map((list) => list.map(questApiToSummary)));
  }

  getPersonal(id: string): Observable<QuestApi> {
    return this.api.get<QuestApi>(`quests/personal/${id}`);
  }

  updatePersonal(id: string, data: UpdatePersonalQuestRequest): Observable<QuestApi> {
    return this.api.put<QuestApi>(`quests/personal/${id}`, data);
  }

  deletePersonal(id: string): Observable<void> {
    return this.api.delete<void>(`quests/personal/${id}`);
  }

  copyToProfile(questId: string, replaceExistingId?: number): Observable<QuestApi> {
    const body: CopyToProfileRequest = replaceExistingId ? { replaceExistingId } : {};
    return this.api.post<QuestApi>(`quests/${questId}/copy-to-profile`, body);
  }

  copyAllFromGame(gameId: string): Observable<{ copied: number; skipped: number }> {
    return this.api.post<{ copied: number; skipped: number }>(
      `games/${gameId}/quests/copy-all-to-profile`,
      {},
    );
  }

  like(id: string): Observable<LikeResponse> {
    return this.api.post<LikeResponse>(`quests/personal/${id}/like`, {});
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.api.delete<LikeResponse>(`quests/personal/${id}/like`);
  }
}
