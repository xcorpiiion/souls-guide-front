import { inject, Injectable } from '@angular/core';
import { HttpService, Page, mapPage } from '@xcorpiiion/ng-core';
import { map, Observable } from 'rxjs';
import { LoreApi, LoreSummary, loreApiToSummary } from '../../shared/models/lore-article.model';
import { FollowResponse } from '../../shared/models/quest.model';
import { LikeResponse } from './personal-quest.service';
import { LoreTypeApi } from '../../features/lore-create/lore-create';

export interface CreateLoreRequest {
  title: string;
  type: LoreTypeApi;
  gameId: string;
  characterName?: string;
  content: string;
  /** Chave do arquivo de destaque na storage-api. Imagens do texto vão dentro de content. */
  coverImageFileKey?: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class LoreService {
  private readonly api = inject(HttpService).resource('lore');

  list(
    page = 0,
    size = 20,
    q?: string,
    gameId?: string,
    category?: string,
  ): Observable<Page<LoreSummary>> {
    // Os `undefined` saem da query sozinhos; `page = 0` fica.
    return this.api
      .page<LoreApi>('', { page, size, q, gameId, category })
      .pipe(map((p) => mapPage(p, loreApiToSummary)));
  }

  search(q: string, size = 20): Observable<LoreSummary[]> {
    return this.api
      .page<LoreApi>('', { q, page: 0, size })
      .pipe(map((p) => p.content.map(loreApiToSummary)));
  }

  get(id: string): Observable<LoreApi> {
    return this.api.get<LoreApi>(id);
  }

  create(data: CreateLoreRequest): Observable<LoreApi> {
    return this.api.post<LoreApi>('', data);
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

  update(id: string, data: CreateLoreRequest): Observable<LoreApi> {
    return this.api.put<LoreApi>(id, data);
  }

  listFollowed(): Observable<LoreSummary[]> {
    return this.api.get<LoreApi[]>('following').pipe(map((list) => list.map(loreApiToSummary)));
  }

  listLiked(): Observable<LoreSummary[]> {
    return this.api.get<LoreApi[]>('liked').pipe(map((list) => list.map(loreApiToSummary)));
  }
}
