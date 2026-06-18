import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { Comunidade } from './comunidade';
import { UserService } from '../../core/services/user.service';
import { GameService } from '../../core/services/game.service';
import { AuthService } from '../../core/services/auth.service';
import { UserSummary } from '../../shared/models/user.model';

const MOCK_USER: UserSummary = {
  id: 1,
  name: 'Vinicius Cruz',
  handle: 'vincruz',
  bio: null,
  questCount: 14,
  loreCount: 5,
  followerCount: 87,
  followingCount: 12,
  isFollowing: false,
  favoriteGame: 'Elden Ring',
};

const PAGE = {
  content: [MOCK_USER],
  totalElements: 1,
  totalPages: 1,
  pageNumber: 0,
  pageSize: 20,
  last: true,
  first: true,
};

function makeUserSvc(following = false) {
  return {
    listUsers: vi.fn(() => of({ ...PAGE, content: [{ ...MOCK_USER, isFollowing: following }] })),
    follow: vi.fn(() => of(undefined)),
    unfollow: vi.fn(() => of(undefined)),
  };
}

function createFixture(
  userSvcOverride?: ReturnType<typeof makeUserSvc>,
): ComponentFixture<Comunidade> {
  TestBed.configureTestingModule({
    imports: [Comunidade],
    providers: [
      provideRouter([]),
      { provide: UserService, useValue: userSvcOverride ?? makeUserSvc() },
      { provide: GameService, useValue: { getFeatured: vi.fn(() => of([])) } },
      {
        provide: AuthService,
        useValue: {
          isLoggedIn: signal(true),
          isGoogleUser: () => false,
          getNickname: () => null,
          getUserId: () => null,
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(Comunidade);
  fixture.detectChanges();
  return fixture;
}

describe('Comunidade', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('carrega usuários no ngOnInit', () => {
    const svc = makeUserSvc();
    createFixture(svc);
    expect(svc.listUsers).toHaveBeenCalledWith('', 0, 20, undefined);
  });

  it('users() é populado após ngOnInit', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.users().length).toBe(1);
    expect(comp.users()[0].name).toBe('Vinicius Cruz');
  });

  it('hasMore() é false quando página é last', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.hasMore()).toBe(false);
  });

  it('initial() retorna a primeira letra em maiúsculo', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.initial('Vinicius')).toBe('V');
    expect(comp.initial('')).toBe('?');
  });

  it('isFollowing() reflete followingIds signal', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.isFollowing(1)).toBe(false);
    comp.followingIds.set(new Set([1]));
    expect(comp.isFollowing(1)).toBe(true);
  });

  it('toggleFollow() chama follow() quando não está seguindo', () => {
    const svc = makeUserSvc(false);
    const fixture = createFixture(svc);
    const comp = fixture.componentInstance as any;
    comp.toggleFollow(MOCK_USER, { preventDefault: vi.fn(), stopPropagation: vi.fn() });
    expect(svc.follow).toHaveBeenCalledWith(MOCK_USER.id);
  });

  it('toggleFollow() chama unfollow() quando já está seguindo', () => {
    const svc = makeUserSvc(true);
    const fixture = createFixture(svc);
    const comp = fixture.componentInstance as any;
    comp.followingIds.set(new Set([MOCK_USER.id]));
    comp.toggleFollow(MOCK_USER, { preventDefault: vi.fn(), stopPropagation: vi.fn() });
    expect(svc.unfollow).toHaveBeenCalledWith(MOCK_USER.id);
  });

  it('selectGame() chama listUsers() com gameId', () => {
    const svc = makeUserSvc();
    const fixture = createFixture(svc);
    const comp = fixture.componentInstance as any;
    svc.listUsers.mockClear();
    comp.selectGame('1');
    expect(svc.listUsers).toHaveBeenCalledWith('', 0, 20, '1');
  });

  it('selectGame(null) chama listUsers() sem gameId', () => {
    const svc = makeUserSvc();
    const fixture = createFixture(svc);
    const comp = fixture.componentInstance as any;
    svc.listUsers.mockClear();
    comp.selectGame(null);
    expect(svc.listUsers).toHaveBeenCalledWith('', 0, 20, undefined);
  });
});
