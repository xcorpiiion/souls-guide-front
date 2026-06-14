import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoreApi, LoreSummary, loreApiToSummary } from '../../shared/models/lore-article.model';
import { FollowResponse } from '../../shared/models/quest.model';
import { Page } from '../../shared/models/page.model';
import { LikeResponse } from './personal-quest.service';
import { LoreTypeApi } from '../../features/lore-create/lore-create';

export interface CreateLoreRequest {
  title: string;
  type: LoreTypeApi;
  gameId: string;
  characterName?: string;
  content: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class LoreService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}/lore`;

  list(
    page = 0,
    size = 20,
    q?: string,
    gameId?: string,
    category?: string,
  ): Observable<Page<LoreSummary>> {
    const params: Record<string, string | number> = { page, size };
    if (q) params['q'] = q;
    if (gameId) params['gameId'] = gameId;
    if (category) params['category'] = category;
    return this.http
      .get<Page<LoreApi>>(this.base, { params })
      .pipe(map((p) => ({ ...p, content: p.content.map(loreApiToSummary) })));
  }

  search(q: string, size = 20): Observable<LoreSummary[]> {
    return this.http
      .get<Page<LoreApi>>(this.base, { params: { q, page: 0, size } })
      .pipe(map((p) => p.content.map(loreApiToSummary)));
  }

  get(id: string): Observable<LoreApi> {
    return this.http.get<LoreApi>(`${this.base}/${id}`);
  }

  create(data: CreateLoreRequest): Observable<LoreApi> {
    return this.http.post<LoreApi>(this.base, data);
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

  update(id: string, data: CreateLoreRequest): Observable<LoreApi> {
    return this.http.put<LoreApi>(`${this.base}/${id}`, data);
  }

  listFollowed(): Observable<LoreSummary[]> {
    return this.http
      .get<LoreApi[]>(`${this.base}/following`)
      .pipe(map((list) => list.map(loreApiToSummary)));
  }

  listLiked(): Observable<LoreSummary[]> {
    return this.http
      .get<LoreApi[]>(`${this.base}/liked`)
      .pipe(map((list) => list.map(loreApiToSummary)));
  }
}
