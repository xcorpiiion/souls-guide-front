import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { map, Observable } from 'rxjs';
import { QuestApi, QuestSummary, questApiToSummary } from '../../shared/models/quest.model';
import { LoreApi, LoreSummary, loreApiToSummary } from '../../shared/models/lore-article.model';

export interface ProfileResponse {
  id: number;
  name: string;
  nickname: string;
  email: string;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  profilePictureUrl?: string | null;
  joinedLabel?: string | null;
  followerCount?: number;
  followingCount?: number;
  createdAt?: string | null;
}

export interface UpdateProfileRequest {
  name: string;
  nickname: string;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  profilePictureUrl?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  // Duas bases: conta e perfil vivem na user-api; conteudo do usuario, na
  // souls-guide-api. E o unico service que fala com as duas.
  private readonly usuarios = inject(HttpService).resource('users', 'users');
  private readonly conteudo = inject(HttpService).resource('');

  getByEmail(email: string): Observable<ProfileResponse> {
    return this.usuarios.get<ProfileResponse>(`email/${encodeURIComponent(email)}`);
  }

  updateProfile(id: number, data: UpdateProfileRequest): Observable<ProfileResponse> {
    return this.usuarios.put<ProfileResponse>(`${id}/profile`, data);
  }

  changePassword(id: number, data: ChangePasswordRequest): Observable<void> {
    return this.usuarios.put<void>(`${id}/password`, data);
  }

  deleteAccount(id: number): Observable<void> {
    return this.usuarios.delete<void>(`${id}`);
  }

  getQuestsByUser(userId: string): Observable<QuestSummary[]> {
    return this.conteudo
      .get<QuestApi[]>(`quests/by-user/${userId}`)
      .pipe(map((list) => list.map(questApiToSummary)));
  }

  getLoreByUser(userId: string): Observable<LoreSummary[]> {
    return this.conteudo
      .get<LoreApi[]>(`lore/by-user/${userId}`)
      .pipe(map((list) => list.map(loreApiToSummary)));
  }
}
