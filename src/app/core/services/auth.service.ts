import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  nickname: string;
  email: string;
  password: string;
}

const ACCESS_TOKEN_KEY = 'sg_access_token';
const REFRESH_TOKEN_KEY = 'sg_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apis.auth}/auth`;

  readonly isLoggedIn = signal(this.hasToken());

  loginWithGoogle(idToken: string) {
    return this.http.post<AuthTokens>(`${this.base}/google`, { socialToken: idToken });
  }

  refresh() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    return this.http.post<AuthTokens>(`${this.base}/refresh`, { refreshToken });
  }

  login(data: LoginRequest) {
    return this.http.post<AuthTokens>(`${this.base}/login`, data);
  }

  signup(data: SignupRequest) {
    return this.http.post<AuthTokens>(`${this.base}/signup`, data);
  }

  saveTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.isLoggedIn.set(true);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  isAccessTokenValid(): boolean {
    const payload = this.getTokenPayload();
    if (!payload) return false;
    const exp = payload['exp'] as number | undefined;
    if (!exp) return false;
    return Date.now() < exp * 1000;
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.isLoggedIn.set(false);
    this.router.navigate(['/home']);
  }

  getTokenPayload(): Record<string, unknown> | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  getEmail(): string | null {
    return (this.getTokenPayload()?.['email'] as string) ?? null;
  }

  forgotPassword(data: { email: string }) {
    return this.http.post<void>(`${this.base}/forgot-password`, data);
  }

  resetPassword(data: { token: string; newPassword: string }) {
    return this.http.post<void>(`${this.base}/reset-password`, data);
  }

  getUserId(): string | null {
    const p = this.getTokenPayload();
    return (p?.['sub'] as string) ?? (p?.['userId'] as string) ?? null;
  }

  getNickname(): string | null {
    const p = this.getTokenPayload();
    return (p?.['nickname'] as string) ?? (p?.['preferred_username'] as string) ?? null;
  }

  isGoogleUser(): boolean {
    const p = this.getTokenPayload();
    return (p?.['authProvider'] as string) === 'GOOGLE';
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  }
}
