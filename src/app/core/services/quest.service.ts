import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FollowResponse,
  QuestApi,
  QuestNode,
  QuestEdge,
  QuestSummary,
  questApiToSummary,
} from '../../shared/models/quest.model';
import { Page } from '../../shared/models/page.model';
import { LikeResponse } from './personal-quest.service';

export interface QuestRequest {
  title: string;
  description: string;
  status: string;
  gameId: number;
  nodes: QuestNode[];
  edges: QuestEdge[];
}

@Injectable({ providedIn: 'root' })
export class QuestService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}/quests`;

  list(
    page = 0,
    size = 20,
    q?: string,
    gameId?: string,
    status?: string,
  ): Observable<Page<QuestSummary>> {
    const params: Record<string, string | number> = { page, size };
    if (q) params['q'] = q;
    if (gameId) params['gameId'] = gameId;
    if (status) params['status'] = status;
    return this.http
      .get<Page<QuestApi>>(this.base, { params })
      .pipe(map((p) => ({ ...p, content: p.content.map(questApiToSummary) })));
  }

  search(q: string, size = 20): Observable<QuestSummary[]> {
    return this.http
      .get<Page<QuestApi>>(this.base, { params: { q, page: 0, size } })
      .pipe(map((p) => p.content.map(questApiToSummary)));
  }

  get(id: string): Observable<QuestApi> {
    return this.http.get<QuestApi>(`${this.base}/${id}`);
  }

  listNodes(questId: string): Observable<QuestNode[]> {
    return this.http.get<QuestNode[]>(`${this.base}/${questId}/nodes`);
  }

  create(request: QuestRequest): Observable<QuestApi> {
    return this.http.post<QuestApi>(this.base, request);
  }

  update(id: string, request: QuestRequest): Observable<QuestApi> {
    return this.http.put<QuestApi>(`${this.base}/${id}`, request);
  }

  like(id: string): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.base}/${id}/like`, {});
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.http.delete<LikeResponse>(`${this.base}/${id}/like`);
  }

  follow(id: string): Observable<FollowResponse> {
    return this.http.post<FollowResponse>(`${this.base}/${id}/follow`, {});
  }

  unfollow(id: string): Observable<FollowResponse> {
    return this.http.delete<FollowResponse>(`${this.base}/${id}/follow`);
  }

  listFollowed(): Observable<QuestSummary[]> {
    return this.http
      .get<QuestApi[]>(`${this.base}/following`)
      .pipe(map((list) => list.map(questApiToSummary)));
  }

  listLiked(): Observable<QuestSummary[]> {
    return this.http
      .get<QuestApi[]>(`${this.base}/liked`)
      .pipe(map((list) => list.map(questApiToSummary)));
  }
}
