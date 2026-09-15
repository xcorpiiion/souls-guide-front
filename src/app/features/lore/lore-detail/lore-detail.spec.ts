import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoreDetail } from './lore-detail';
import { LoreService } from '../../../core/services/lore.service';
import { AuthService } from '@xcorpiiion/ng-core';
import { LoreApi } from '../../../shared/models/lore-article.model';

const MOCK_LORE_API: LoreApi = {
  id: 1,
  title: 'Ranni, a Bruxa das Estrelas',
  content: 'Conteúdo do artigo de lore.\n\nSegundo parágrafo.',
  status: 'CANONICO',
  type: 'CHARACTER',
  characterName: 'Ranni',
  tags: ['magia lunar'],
  userId: 'vincruz',
  gameId: 1,
  gameName: 'Elden Ring',
  items: [],
  isPersonal: false,
  ownerId: null,
  isPublic: true,
  allowCopy: true,
  likeCount: 5,
  userHasLiked: false,
  followerCount: 0,
  userIsFollowing: false,
};

function makeAuth(loggedIn: boolean) {
  return { isLoggedIn: () => loggedIn, userId: () => null } as unknown as AuthService;
}

const MOCK_LORE_WITH_FOLLOW: LoreApi = {
  ...MOCK_LORE_API,
  followerCount: 3,
  userIsFollowing: false,
};

function createFixture(
  id: string,
  serviceMock?: Partial<LoreService>,
  auth: AuthService = makeAuth(true),
): ComponentFixture<LoreDetail> {
  const loreServiceMock = serviceMock ?? {
    get: vi.fn(() => of(MOCK_LORE_WITH_FOLLOW)),
    like: vi.fn(),
    unlike: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [LoreDetail],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ id }),
            queryParamMap: convertToParamMap({}),
            url: [],
          },
        },
      },
      { provide: LoreService, useValue: loreServiceMock },
      { provide: AuthService, useValue: auth },
    ],
  });
  const fixture = TestBed.createComponent(LoreDetail);
  fixture.detectChanges();
  return fixture;
}

describe('LoreDetail', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture('1');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir o título do artigo', () => {
    const fixture = createFixture('1');
    const title = fixture.nativeElement.querySelector('.ld__title')?.textContent?.trim();
    expect(title).toBe(MOCK_LORE_API.title);
  });

  it('deve exibir parágrafos do conteúdo', () => {
    const fixture = createFixture('1');
    const paras = fixture.nativeElement.querySelectorAll('.ld__paragraph');
    expect(paras.length).toBeGreaterThanOrEqual(1);
  });

  it('deve exibir not-found quando service retorna erro', () => {
    const svcMock = { get: vi.fn(() => throwError(() => ({ status: 404 }))) };
    const fixture = createFixture('inexistente', svcMock as unknown as Partial<LoreService>);
    expect(fixture.nativeElement.querySelector('.ld__not-found')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.ld')).toBeFalsy();
  });

  it('deve exibir erro de privado quando status 403', () => {
    const svcMock = { get: vi.fn(() => throwError(() => ({ status: 403 }))) };
    const fixture = createFixture('privado', svcMock as unknown as Partial<LoreService>);
    expect(fixture.nativeElement.querySelector('.ld__not-found')?.textContent).toContain('privado');
  });

  describe('citações', () => {
    const COM_CITACOES: LoreApi = {
      ...MOCK_LORE_API,
      characterName: null,
      content: [
        'A enfermeira sabia.',
        '> Dia 14: a menina voltou.\n— Diário · documento, Cap. 2 · por Enfermeira',
        '> JAMES: Mary?\n> LAURA: Ela não está aqui.\n— Ponte · diálogo, Cap. 3 · com James, Laura',
      ].join('\n\n'),
    };

    function comCitacoes() {
      return createFixture('1', { get: vi.fn(() => of(COM_CITACOES)) } as Partial<LoreService>);
    }

    it('cada citação diz o tipo, e o diálogo sai fala a fala', () => {
      const el = comCitacoes().nativeElement as HTMLElement;
      const tipos = Array.from(el.querySelectorAll('.ld__citacao-tipo')).map((t) =>
        t.textContent?.replace(/\s+/g, '').trim(),
      );
      expect(tipos).toEqual(['documento·Cap.2', 'diálogo·Cap.3']);
      // Numa nota, "Dia 14:" continua texto.
      expect(el.querySelector('.ld__trecho-texto')?.textContent).toBe('Dia 14: a menina voltou.');
      const nomes = Array.from(el.querySelectorAll('.ld__fala-nome')).map((n) => n.textContent);
      expect(nomes).toEqual(['JAMES', 'LAURA']);
    });

    it('"quem aparece" lista as pessoas, e tocar numa apaga as citações das outras', () => {
      const fixture = comCitacoes();
      const el = fixture.nativeElement as HTMLElement;
      const pessoas = Array.from(el.querySelectorAll<HTMLButtonElement>('.ld__pessoa'));
      expect(pessoas.map((p) => p.querySelector('.ld__pessoa-nome')?.textContent)).toEqual([
        'Enfermeira',
        'James',
        'Laura',
      ]);

      pessoas[0].click();
      fixture.detectChanges();
      const citacoes = el.querySelectorAll('.ld__citacao');
      expect(citacoes[0].classList).not.toContain('ld__citacao--apagada');
      expect(citacoes[1].classList).toContain('ld__citacao--apagada');

      pessoas[0].click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.ld__citacao--apagada')).toHaveLength(0);
    });

    it('não diz mais "lore do mundo" nem "de personagem"', () => {
      const t = (comCitacoes().nativeElement as HTMLElement).textContent ?? '';
      expect(t).not.toContain('lore do mundo');
      expect(t).not.toContain('lore de personagem');
    });
  });

  describe('likes', () => {
    it('inicializa likeCount e userHasLiked da API', () => {
      const fixture = createFixture('1');
      const comp = fixture.componentInstance as any;
      expect(comp.likeCount()).toBe(5);
      expect(comp.userHasLiked()).toBe(false);
    });

    it('exibe botão de like sempre visível', () => {
      const fixture = createFixture('1', undefined, makeAuth(false));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.ld__btn'),
      );
      const btn = btns.find((b) => b.querySelector('.ti-heart, .ti-heart-filled'));
      expect(btn).toBeTruthy();
    });

    it('botão de like está desabilitado quando não logado', () => {
      const fixture = createFixture('1', undefined, makeAuth(false));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.ld__btn'),
      );
      const btn = btns.find((b) => b.querySelector('.ti-heart, .ti-heart-filled'));
      expect(btn?.disabled).toBe(true);
    });

    it('botão de like está habilitado quando logado', () => {
      const fixture = createFixture('1', undefined, makeAuth(true));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.ld__btn'),
      );
      const btn = btns.find((b) => b.querySelector('.ti-heart, .ti-heart-filled'));
      expect(btn?.disabled).toBe(false);
    });

    it('chama like() e atualiza signals após toggleLike quando não curtiu', () => {
      const likeResp = { likeCount: 6, userHasLiked: true };
      const svcMock = {
        get: vi.fn(() => of(MOCK_LORE_API)),
        like: vi.fn(() => of(likeResp)),
        unlike: vi.fn(),
      };
      const fixture = createFixture('1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleLike();
      expect(svcMock.like).toHaveBeenCalledWith('1');
      expect(comp.likeCount()).toBe(6);
      expect(comp.userHasLiked()).toBe(true);
    });

    it('chama unlike() e atualiza signals após toggleLike quando já curtiu', () => {
      const apiWithLike = { ...MOCK_LORE_API, likeCount: 6, userHasLiked: true };
      const likeResp = { likeCount: 5, userHasLiked: false };
      const svcMock = {
        get: vi.fn(() => of(apiWithLike)),
        unlike: vi.fn(() => of(likeResp)),
        like: vi.fn(),
      };
      const fixture = createFixture('1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleLike();
      expect(svcMock.unlike).toHaveBeenCalledWith('1');
      expect(comp.likeCount()).toBe(5);
      expect(comp.userHasLiked()).toBe(false);
    });

    it('trata erro 409 setando userHasLiked=true', () => {
      const svcMock = {
        get: vi.fn(() => of(MOCK_LORE_API)),
        like: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409 }))),
        unlike: vi.fn(),
      };
      const fixture = createFixture('1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleLike();
      expect(comp.userHasLiked()).toBe(true);
      expect(comp.liking()).toBe(false);
    });

    it('não chama like() enquanto liking=true', () => {
      const svcMock = {
        get: vi.fn(() => of(MOCK_LORE_WITH_FOLLOW)),
        like: vi.fn(() => of({ likeCount: 6, userHasLiked: true })),
        unlike: vi.fn(),
        follow: vi.fn(),
        unfollow: vi.fn(),
      };
      const fixture = createFixture('1', svcMock);
      const comp = fixture.componentInstance as any;
      comp['liking'].set(true);
      comp.toggleLike();
      expect(svcMock.like).not.toHaveBeenCalled();
    });
  });

  describe('follow', () => {
    it('inicializa followerCount e userIsFollowing da API', () => {
      const fixture = createFixture('1');
      const comp = fixture.componentInstance as any;
      expect(comp.followerCount()).toBe(3);
      expect(comp.userIsFollowing()).toBe(false);
    });

    it('exibe botão de seguir sempre visível', () => {
      const fixture = createFixture('1', undefined, makeAuth(false));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.ld__btn'),
      );
      const btn = btns.find((b) => b.querySelector('.ti-bell, .ti-bell-ringing'));
      expect(btn).toBeTruthy();
    });

    it('botão de seguir está desabilitado quando não logado', () => {
      const fixture = createFixture('1', undefined, makeAuth(false));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.ld__btn'),
      );
      const btn = btns.find((b) => b.querySelector('.ti-bell, .ti-bell-ringing'));
      expect(btn?.disabled).toBe(true);
    });

    it('botão de seguir está habilitado quando logado', () => {
      const fixture = createFixture('1', undefined, makeAuth(true));
      const btns: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button.ld__btn'),
      );
      const btn = btns.find((b) => b.querySelector('.ti-bell, .ti-bell-ringing'));
      expect(btn?.disabled).toBe(false);
    });

    it('chama follow() e atualiza signals ao seguir', () => {
      const followResp = { followerCount: 4, userIsFollowing: true };
      const svcMock = {
        get: vi.fn(() => of(MOCK_LORE_WITH_FOLLOW)),
        like: vi.fn(),
        unlike: vi.fn(),
        follow: vi.fn(() => of(followResp)),
        unfollow: vi.fn(),
      };
      const fixture = createFixture('1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleFollow();
      expect(svcMock.follow).toHaveBeenCalledWith('1');
      expect(comp.followerCount()).toBe(4);
      expect(comp.userIsFollowing()).toBe(true);
    });

    it('chama unfollow() e atualiza signals ao deixar de seguir', () => {
      const apiFollowing = { ...MOCK_LORE_WITH_FOLLOW, followerCount: 4, userIsFollowing: true };
      const followResp = { followerCount: 3, userIsFollowing: false };
      const svcMock = {
        get: vi.fn(() => of(apiFollowing)),
        like: vi.fn(),
        unlike: vi.fn(),
        follow: vi.fn(),
        unfollow: vi.fn(() => of(followResp)),
      };
      const fixture = createFixture('1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleFollow();
      expect(svcMock.unfollow).toHaveBeenCalledWith('1');
      expect(comp.followerCount()).toBe(3);
      expect(comp.userIsFollowing()).toBe(false);
    });

    it('trata erro 409 setando userIsFollowing=true', () => {
      const svcMock = {
        get: vi.fn(() => of(MOCK_LORE_WITH_FOLLOW)),
        like: vi.fn(),
        unlike: vi.fn(),
        follow: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 409 }))),
        unfollow: vi.fn(),
      };
      const fixture = createFixture('1', svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleFollow();
      expect(comp.userIsFollowing()).toBe(true);
      expect(comp.following()).toBe(false);
    });

    it('não chama follow() enquanto following=true', () => {
      const svcMock = {
        get: vi.fn(() => of(MOCK_LORE_WITH_FOLLOW)),
        like: vi.fn(),
        unlike: vi.fn(),
        follow: vi.fn(() => of({ followerCount: 4, userIsFollowing: true })),
        unfollow: vi.fn(),
      };
      const fixture = createFixture('1', svcMock);
      const comp = fixture.componentInstance as any;
      comp['following'].set(true);
      comp.toggleFollow();
      expect(svcMock.follow).not.toHaveBeenCalled();
    });
  });
});
