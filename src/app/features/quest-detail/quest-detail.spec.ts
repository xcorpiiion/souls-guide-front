import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { QuestDetail } from './quest-detail';
import { QUESTS_DETAIL } from './quest-detail.mocks';
import { QuestService } from '../../core/services/quest.service';
import { QuestApi } from '../../shared/models/quest.model';
import { AuthService } from '../../core/services/auth.service';

const MOCK_QUEST = QUESTS_DETAIL.find((q) => q.id === 'er-q1')!;

const MOCK_QUEST_API: QuestApi = {
  id: 1,
  title: MOCK_QUEST.title,
  description: MOCK_QUEST.description ?? '',
  status: MOCK_QUEST.status,
  userId: 'user-1',
  gameId: 1,
  gameName: MOCK_QUEST.gameName,
  nodes: MOCK_QUEST.nodes,
  edges: MOCK_QUEST.edges,
  relatedQuests: MOCK_QUEST.relatedQuests,
  isPersonal: false,
  ownerId: null,
  isOwner: false,
  isPublic: true,
  allowCopy: false,
  likeCount: 7,
  userHasLiked: false,
  followerCount: 10,
  userIsFollowing: false,
};

function makeAuth(loggedIn: boolean) {
  return { isLoggedIn: () => loggedIn } as unknown as AuthService;
}

function createFixture(
  gameId: string,
  questId: string,
  serviceMock?: Partial<QuestService>,
  auth: AuthService = makeAuth(true),
): ComponentFixture<QuestDetail> {
  const questServiceMock = serviceMock ?? {
    get: vi.fn(() => of(MOCK_QUEST_API)),
    like: vi.fn(),
    unlike: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [QuestDetail],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ gameId, questId }),
            queryParamMap: convertToParamMap({}),
            url: [],
          },
          paramMap: of(convertToParamMap({ gameId, questId })),
        },
      },
      { provide: QuestService, useValue: questServiceMock },
      { provide: AuthService, useValue: auth },
    ],
  });
  const fixture = TestBed.createComponent(QuestDetail);
  fixture.detectChanges();
  return fixture;
}

describe('QuestDetail', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir o título da quest', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    const title = fixture.nativeElement.querySelector('.quest-detail__title')?.textContent?.trim();
    expect(title).toBe(MOCK_QUEST.title);
  });

  it('deve exibir as 4 stats', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    const stats = fixture.nativeElement.querySelectorAll('.quest-detail__stat');
    expect(stats.length).toBe(4);
  });

  it('deve renderizar o checklist da quest', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    expect(fixture.nativeElement.querySelector('app-quest-checklist')).toBeTruthy();
  });

  it('deve exibir not-found quando service retorna erro', () => {
    const errService = { get: vi.fn(() => throwError(() => new Error('not found'))) };
    const fixture = createFixture(
      'elden-ring',
      'inexistente',
      errService as unknown as Partial<QuestService>,
    );
    expect(fixture.nativeElement.querySelector('.quest-detail__not-found')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.quest-detail')).toBeFalsy();
  });

  it('deve exibir o badge de status da quest', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    const badge = fixture.nativeElement.querySelector('.quest-detail__status');
    expect(badge?.textContent?.trim()).toBe('canonico');
  });

  describe('likes', () => {
    it('inicializa likeCount e userHasLiked da API', () => {
      const fixture = createFixture('elden-ring', 'er-q1');
      const comp = fixture.componentInstance as any;
      expect(comp.likeCount()).toBe(7);
      expect(comp.userHasLiked()).toBe(false);
    });

    it('exibe botão de like sempre visível', () => {
      const fixture = createFixture('elden-ring', 'er-q1', undefined, makeAuth(false));
      const btn = fixture.nativeElement.querySelector('button.quest-detail__btn--ghost i.ti-heart');
      expect(btn).toBeTruthy();
    });

    it('botão de like está desabilitado quando não logado', () => {
      const fixture = createFixture('elden-ring', 'er-q1', undefined, makeAuth(false));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.quest-detail__btn--ghost'),
      );
      const likeBtn = btns.find((b) => b.querySelector('i.ti-heart'));
      expect(likeBtn?.disabled).toBe(true);
    });

    it('botão de like está habilitado quando logado', () => {
      const fixture = createFixture('elden-ring', 'er-q1', undefined, makeAuth(true));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.quest-detail__btn--ghost'),
      );
      const likeBtn = btns.find((b) => b.querySelector('i.ti-heart'));
      expect(likeBtn?.disabled).toBe(false);
    });

    it('chama like() e atualiza signals após toggleLike quando não curtiu', () => {
      const likeResp = { likeCount: 8, userHasLiked: true };
      const svcMock = {
        get: vi.fn(() => of(MOCK_QUEST_API)),
        like: vi.fn(() => of(likeResp)),
        unlike: vi.fn(),
      };
      const fixture = createFixture('elden-ring', 'er-q1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleLike();
      expect(svcMock.like).toHaveBeenCalledWith('er-q1');
      expect(comp.likeCount()).toBe(8);
      expect(comp.userHasLiked()).toBe(true);
    });

    it('chama unlike() e atualiza signals após toggleLike quando já curtiu', () => {
      const apiWithLike = { ...MOCK_QUEST_API, likeCount: 8, userHasLiked: true };
      const likeResp = { likeCount: 7, userHasLiked: false };
      const svcMock = {
        get: vi.fn(() => of(apiWithLike)),
        unlike: vi.fn(() => of(likeResp)),
        like: vi.fn(),
      };
      const fixture = createFixture('elden-ring', 'er-q1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleLike();
      expect(svcMock.unlike).toHaveBeenCalledWith('er-q1');
      expect(comp.likeCount()).toBe(7);
      expect(comp.userHasLiked()).toBe(false);
    });

    it('trata erro 409 setando userHasLiked=true', () => {
      const svcMock = {
        get: vi.fn(() => of(MOCK_QUEST_API)),
        like: vi.fn(() => throwError(() => ({ status: 409 }))),
        unlike: vi.fn(),
      };
      const fixture = createFixture('elden-ring', 'er-q1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleLike();
      expect(comp.userHasLiked()).toBe(true);
      expect(comp.liking()).toBe(false);
    });

    it('não chama like() duas vezes enquanto liking=true', () => {
      const svcMock = {
        get: vi.fn(() => of(MOCK_QUEST_API)),
        like: vi.fn(() => of({ likeCount: 8, userHasLiked: true })),
        unlike: vi.fn(),
        follow: vi.fn(),
        unfollow: vi.fn(),
      };
      const fixture = createFixture('elden-ring', 'er-q1', svcMock);
      const comp = fixture.componentInstance as any;
      comp['liking'].set(true);
      comp.toggleLike();
      expect(svcMock.like).not.toHaveBeenCalled();
    });
  });

  describe('follow', () => {
    it('inicializa followerCount e userIsFollowing da API', () => {
      const fixture = createFixture('elden-ring', 'er-q1');
      const comp = fixture.componentInstance as any;
      expect(comp.followerCount()).toBe(10);
      expect(comp.userIsFollowing()).toBe(false);
    });

    it('exibe botão de seguir sempre visível', () => {
      const fixture = createFixture('elden-ring', 'er-q1', undefined, makeAuth(false));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.quest-detail__btn--ghost'),
      );
      const followBtn = btns.find((b) => b.querySelector('i.ti-bell'));
      expect(followBtn).toBeTruthy();
    });

    it('botão de seguir está desabilitado quando não logado', () => {
      const fixture = createFixture('elden-ring', 'er-q1', undefined, makeAuth(false));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.quest-detail__btn--ghost'),
      );
      const followBtn = btns.find((b) => b.querySelector('i.ti-bell'));
      expect(followBtn?.disabled).toBe(true);
    });

    it('botão de seguir está habilitado quando logado', () => {
      const fixture = createFixture('elden-ring', 'er-q1', undefined, makeAuth(true));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.quest-detail__btn--ghost'),
      );
      const followBtn = btns.find((b) => b.querySelector('i.ti-bell'));
      expect(followBtn?.disabled).toBe(false);
    });

    it('chama follow() e atualiza signals ao seguir', () => {
      const followResp = { followerCount: 11, userIsFollowing: true };
      const svcMock = {
        get: vi.fn(() => of(MOCK_QUEST_API)),
        like: vi.fn(),
        unlike: vi.fn(),
        follow: vi.fn(() => of(followResp)),
        unfollow: vi.fn(),
      };
      const fixture = createFixture('elden-ring', 'er-q1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleFollow();
      expect(svcMock.follow).toHaveBeenCalledWith('er-q1');
      expect(comp.followerCount()).toBe(11);
      expect(comp.userIsFollowing()).toBe(true);
    });

    it('chama unfollow() e atualiza signals ao deixar de seguir', () => {
      const apiFollowing = { ...MOCK_QUEST_API, followerCount: 11, userIsFollowing: true };
      const followResp = { followerCount: 10, userIsFollowing: false };
      const svcMock = {
        get: vi.fn(() => of(apiFollowing)),
        like: vi.fn(),
        unlike: vi.fn(),
        follow: vi.fn(),
        unfollow: vi.fn(() => of(followResp)),
      };
      const fixture = createFixture('elden-ring', 'er-q1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleFollow();
      expect(svcMock.unfollow).toHaveBeenCalledWith('er-q1');
      expect(comp.followerCount()).toBe(10);
      expect(comp.userIsFollowing()).toBe(false);
    });

    it('trata erro 409 setando userIsFollowing=true', () => {
      const svcMock = {
        get: vi.fn(() => of(MOCK_QUEST_API)),
        like: vi.fn(),
        unlike: vi.fn(),
        follow: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409 }))),
        unfollow: vi.fn(),
      };
      const fixture = createFixture('elden-ring', 'er-q1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleFollow();
      expect(comp.userIsFollowing()).toBe(true);
      expect(comp.following()).toBe(false);
    });

    it('não chama follow() enquanto following=true', () => {
      const svcMock = {
        get: vi.fn(() => of(MOCK_QUEST_API)),
        like: vi.fn(),
        unlike: vi.fn(),
        follow: vi.fn(() => of({ followerCount: 11, userIsFollowing: true })),
        unfollow: vi.fn(),
      };
      const fixture = createFixture('elden-ring', 'er-q1', svcMock);
      const comp = fixture.componentInstance as any;
      comp['following'].set(true);
      comp.toggleFollow();
      expect(svcMock.follow).not.toHaveBeenCalled();
    });
  });

  describe('share', () => {
    it('toggleSharePopover alterna o popover e reseta copied', () => {
      const fixture = createFixture('elden-ring', 'er-q1');
      const comp = fixture.componentInstance as any;
      expect(comp.showSharePopover()).toBe(false);
      comp.toggleSharePopover();
      expect(comp.showSharePopover()).toBe(true);
      comp['copied'].set(true);
      comp.toggleSharePopover();
      expect(comp.showSharePopover()).toBe(false);
      expect(comp.copied()).toBe(false);
    });

    it('copyLink() chama navigator.clipboard.writeText com a URL atual', async () => {
      const fixture = createFixture('elden-ring', 'er-q1');
      const comp = fixture.componentInstance as any;
      const writeSpy = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeSpy },
        configurable: true,
      });
      await comp.copyLink();
      expect(writeSpy).toHaveBeenCalledWith(window.location.href);
      expect(comp.copied()).toBe(true);
    });
  });
});
