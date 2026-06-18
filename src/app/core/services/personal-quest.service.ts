import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
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
  isPublic: boolean;
  allowCopy: boolean;
}

export interface UpdatePersonalQuestRequest {
  title?: string;
  description?: string;
  status?: QuestStatus;
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
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}`;

  createPersonal(data: CreatePersonalQuestRequest): Observable<QuestApi> {
    return this.http.post<QuestApi>(`${this.base}/quests/personal`, data);
  }

  listByUser(userId: string): Observable<QuestSummary[]> {
    return this.http
      .get<QuestApi[]>(`${this.base}/users/${userId}/quests`)
      .pipe(map((list) => list.map(questApiToSummary)));
  }

  getPersonal(id: string): Observable<QuestApi> {
    return this.http.get<QuestApi>(`${this.base}/quests/personal/${id}`);
  }

  updatePersonal(id: string, data: UpdatePersonalQuestRequest): Observable<QuestApi> {
    return this.http.put<QuestApi>(`${this.base}/quests/personal/${id}`, data);
  }

  deletePersonal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/quests/personal/${id}`);
  }

  copyToProfile(questId: string, replaceExistingId?: number): Observable<QuestApi> {
    const body: CopyToProfileRequest = replaceExistingId ? { replaceExistingId } : {};
    return this.http.post<QuestApi>(`${this.base}/quests/${questId}/copy-to-profile`, body);
  }

  like(id: string): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.base}/quests/personal/${id}/like`, {});
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.http.delete<LikeResponse>(`${this.base}/quests/personal/${id}/like`);
  }
}
