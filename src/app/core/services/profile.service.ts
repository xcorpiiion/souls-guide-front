import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
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
  private readonly http = inject(HttpClient);
  private readonly usersBase = `${environment.apis.users}/users`;
  private readonly sgBase = `${environment.apis.soulsGuide}`;

  getByEmail(email: string): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.usersBase}/email/${encodeURIComponent(email)}`);
  }

  updateProfile(id: number, data: UpdateProfileRequest): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${this.usersBase}/${id}/profile`, data);
  }

  changePassword(id: number, data: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.usersBase}/${id}/password`, data);
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.usersBase}/${id}`);
  }

  getQuestsByUser(userId: number): Observable<QuestSummary[]> {
    return this.http
      .get<QuestApi[]>(`${this.sgBase}/quests/by-user/${userId}`)
      .pipe(map((list) => list.map(questApiToSummary)));
  }

  getLoreByUser(userId: number): Observable<LoreSummary[]> {
    return this.http
      .get<LoreApi[]>(`${this.sgBase}/lore/by-user/${userId}`)
      .pipe(map((list) => list.map(loreApiToSummary)));
  }
}
