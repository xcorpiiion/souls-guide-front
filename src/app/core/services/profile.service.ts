import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
  private readonly base = `${environment.apis.users}/users`;

  getByEmail(email: string) {
    return this.http.get<ProfileResponse>(`${this.base}/email/${encodeURIComponent(email)}`);
  }

  updateProfile(id: number, data: UpdateProfileRequest) {
    return this.http.put<ProfileResponse>(`${this.base}/${id}/profile`, data);
  }

  changePassword(id: number, data: ChangePasswordRequest) {
    return this.http.put<void>(`${this.base}/${id}/password`, data);
  }

  deleteAccount(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
