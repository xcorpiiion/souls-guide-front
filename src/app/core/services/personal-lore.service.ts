import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoreApi, LoreSummary, loreApiToSummary } from '../../shared/models/lore-article.model';
import { LoreTypeApi } from '../../features/lore-create/lore-create';
import { LikeResponse } from './personal-quest.service';

export type CopyLoreFilterType = 'all' | 'world' | 'character';

export interface CreatePersonalLoreRequest {
  title: string;
  type: LoreTypeApi;
  gameId: string;
  characterName?: string;
  content: string;
  tags?: string[];
  isPublic: boolean;
  allowCopy: boolean;
}

export interface UpdatePersonalLoreRequest {
  title?: string;
  content?: string;
  type?: LoreTypeApi;
  characterName?: string;
  tags?: string[];
  itemIds?: number[];
  isPublic?: boolean;
  allowCopy?: boolean;
}

export interface CopyLoreToProfileRequest {
  filterType: CopyLoreFilterType;
  replaceExistingId?: number;
}

@Injectable({ providedIn: 'root' })
export class PersonalLoreService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}`;

  createPersonal(data: CreatePersonalLoreRequest): Observable<LoreApi> {
    return this.http.post<LoreApi>(`${this.base}/lore/personal`, data);
  }

  getPersonal(id: string): Observable<LoreApi> {
    return this.http.get<LoreApi>(`${this.base}/lore/personal/${id}`);
  }

  listByUser(userId: string): Observable<LoreSummary[]> {
    return this.http
      .get<LoreApi[]>(`${this.base}/lore/by-user/${userId}`)
      .pipe(map((list) => list.map(loreApiToSummary)));
  }

  updatePersonal(id: string, data: UpdatePersonalLoreRequest): Observable<LoreApi> {
    return this.http.put<LoreApi>(`${this.base}/lore/personal/${id}`, data);
  }

  deletePersonal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lore/personal/${id}`);
  }

  copyToProfile(
    loreId: string,
    filterType: CopyLoreFilterType,
    replaceExistingId?: number,
  ): Observable<LoreApi> {
    const body: CopyLoreToProfileRequest = {
      filterType,
      ...(replaceExistingId ? { replaceExistingId } : {}),
    };
    return this.http.post<LoreApi>(`${this.base}/lore/${loreId}/copy-to-profile`, body);
  }

  like(id: string): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.base}/lore/personal/${id}/like`, {});
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.http.delete<LikeResponse>(`${this.base}/lore/personal/${id}/like`);
  }
}
