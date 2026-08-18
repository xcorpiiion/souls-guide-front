import { inject, Injectable } from '@angular/core';
import { HttpService, Page, mapPage } from '@xcorpiiion/ng-core';
import { map, Observable } from 'rxjs';
import {
  FollowResponse,
  QuestApi,
  QuestNode,
  QuestEdge,
  QuestSummary,
  questApiToSummary,
} from '../../shared/models/quest.model';
import { LikeResponse } from './personal-quest.service';

export interface QuestRequest {
  title: string;
  description: string;
  status: string;
  gameId: number;
  /** Chave do arquivo de capa na storage-api. As dos passos vão em cada nó. */
  coverImageFileKey?: string;
  nodes: QuestNode[];
  edges: QuestEdge[];
}

@Injectable({ providedIn: 'root' })
export class QuestService {
  private readonly api = inject(HttpService).resource('quests');

  list(
    page = 0,
    size = 20,
    q?: string,
    gameId?: string,
    status?: string,
  ): Observable<Page<QuestSummary>> {
    return this.api
      .page<QuestApi>('', { page, size, q, gameId, status })
      .pipe(map((p) => mapPage(p, questApiToSummary)));
  }

  search(q: string, size = 20): Observable<QuestSummary[]> {
    return this.api
      .page<QuestApi>('', { q, page: 0, size })
      .pipe(map((p) => p.content.map(questApiToSummary)));
  }

  get(id: string): Observable<QuestApi> {
    return this.api.get<QuestApi>(id);
  }

  listNodes(questId: string): Observable<QuestNode[]> {
    return this.api.get<QuestNode[]>(`${questId}/nodes`);
  }

  create(request: QuestRequest): Observable<QuestApi> {
    return this.api.post<QuestApi>('', request);
  }

  update(id: string, request: QuestRequest): Observable<QuestApi> {
    return this.api.put<QuestApi>(id, request);
  }

  like(id: string): Observable<LikeResponse> {
    return this.api.post<LikeResponse>(`${id}/like`, {});
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.api.delete<LikeResponse>(`${id}/like`);
  }

  follow(id: string): Observable<FollowResponse> {
    return this.api.post<FollowResponse>(`${id}/follow`, {});
  }

  unfollow(id: string): Observable<FollowResponse> {
    return this.api.delete<FollowResponse>(`${id}/follow`);
  }

  listFollowed(): Observable<QuestSummary[]> {
    return this.api.get<QuestApi[]>('following').pipe(map((list) => list.map(questApiToSummary)));
  }

  listLiked(): Observable<QuestSummary[]> {
    return this.api.get<QuestApi[]>('liked').pipe(map((list) => list.map(questApiToSummary)));
  }
}
