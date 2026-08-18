import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { map, Observable } from 'rxjs';
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
  private readonly api = inject(HttpService).resource('lore');

  createPersonal(data: CreatePersonalLoreRequest): Observable<LoreApi> {
    return this.api.post<LoreApi>('personal', data);
  }

  getPersonal(id: string): Observable<LoreApi> {
    return this.api.get<LoreApi>(`personal/${id}`);
  }

  listByUser(userId: string): Observable<LoreSummary[]> {
    return this.api
      .get<LoreApi[]>(`by-user/${userId}`)
      .pipe(map((list) => list.map(loreApiToSummary)));
  }

  updatePersonal(id: string, data: UpdatePersonalLoreRequest): Observable<LoreApi> {
    return this.api.put<LoreApi>(`personal/${id}`, data);
  }

  deletePersonal(id: string): Observable<void> {
    return this.api.delete<void>(`personal/${id}`);
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
    return this.api.post<LoreApi>(`${loreId}/copy-to-profile`, body);
  }

  like(id: string): Observable<LikeResponse> {
    return this.api.post<LikeResponse>(`personal/${id}/like`, {});
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.api.delete<LikeResponse>(`personal/${id}/like`);
  }
}
