import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { UserService } from './user.service';
import { UserSummary, UserPublicProfile } from '../../shared/models/user.model';

const BASE = 'http://localhost:8765/souls-guide-api/users';

const MOCK_USER: UserSummary = {
  id: 1,
  name: 'Vinicius Cruz',
  handle: 'vincruz',
  bio: 'Explorador de lore',
  questCount: 14,
  loreCount: 5,
  followerCount: 87,
  followingCount: 12,
  isFollowing: false,
  favoriteGame: 'Elden Ring',
};

const MOCK_PROFILE: UserPublicProfile = {
  id: 1,
  name: 'Vinicius Cruz',
  handle: 'vincruz',
  bio: 'Explorador de lore',
  joinedLabel: 'jan 2025',
  questCount: 14,
  loreCount: 5,
  followerCount: 87,
  followingCount: 12,
  isFollowing: false,
};

describe('UserService', () => {
  let svc: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('deve criar o serviço', () => {
    expect(svc).toBeTruthy();
  });

  describe('listUsers()', () => {
    it('faz GET /users com parâmetros de paginação', () => {
      svc.listUsers('', 0, 20).subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      req.flush({
        content: [MOCK_USER],
        totalElements: 1,
        totalPages: 1,
        pageNumber: 0,
        pageSize: 20,
        last: true,
        first: true,
      });
    });

    it('inclui parâmetro q quando informado', () => {
      svc.listUsers('ranni', 0, 20).subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('q')).toBe('ranni');
      req.flush({
        content: [],
        totalElements: 0,
        totalPages: 0,
        pageNumber: 0,
        pageSize: 20,
        last: true,
        first: true,
      });
    });

    it('inclui gameId quando informado', () => {
      svc.listUsers('', 0, 20, '1').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('gameId')).toBe('1');
      req.flush({
        content: [],
        totalElements: 0,
        totalPages: 0,
        pageNumber: 0,
        pageSize: 20,
        last: true,
        first: true,
      });
    });
  });

  describe('getByHandle()', () => {
    it('faz GET /users/handle/:handle', () => {
      svc.getByHandle('vincruz').subscribe();
      http.expectOne(`${BASE}/handle/vincruz`).flush(MOCK_PROFILE);
    });
  });

  describe('getFollowers()', () => {
    it('faz GET /users/:id/followers', () => {
      svc.getFollowers(1).subscribe();
      http.expectOne(`${BASE}/1/followers`).flush([MOCK_USER]);
    });
  });

  describe('getFollowing()', () => {
    it('faz GET /users/:id/following', () => {
      svc.getFollowing(1).subscribe();
      http.expectOne(`${BASE}/1/following`).flush([MOCK_USER]);
    });
  });

  describe('follow()', () => {
    it('faz POST /users/:id/follow', () => {
      svc.follow(2).subscribe();
      const req = http.expectOne(`${BASE}/2/follow`);
      expect(req.request.method).toBe('POST');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });

  describe('unfollow()', () => {
    it('faz DELETE /users/:id/follow', () => {
      svc.unfollow(2).subscribe();
      const req = http.expectOne(`${BASE}/2/follow`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});
