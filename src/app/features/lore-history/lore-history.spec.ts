import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { LoreHistory } from './lore-history';
import { LoreVersionService } from '../../core/services/lore-version.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { LORE_HISTORY_MOCK } from './lore-history.mocks';

function makeAuth(loggedIn: boolean) {
  return { isLoggedIn: () => loggedIn } as unknown as AuthService;
}

const TOAST_MOCK = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };

function createFixture(
  versionSvcMock: Partial<LoreVersionService>,
  loggedIn = true,
): ComponentFixture<LoreHistory> {
  TestBed.configureTestingModule({
    imports: [LoreHistory],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ loreId: '42' }),
            queryParamMap: convertToParamMap({}),
            url: [],
          },
        },
      },
      { provide: LoreVersionService, useValue: versionSvcMock },
      { provide: AuthService, useValue: makeAuth(loggedIn) },
      { provide: ToastService, useValue: TOAST_MOCK },
    ],
  });
  const fixture = TestBed.createComponent(LoreHistory);
  fixture.detectChanges();
  return fixture;
}

describe('LoreHistory', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('deve criar o componente', () => {
    const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('carrega as versões na inicialização', () => {
    const listSpy = vi.fn(() => of(LORE_HISTORY_MOCK));
    const fixture = createFixture({ list: listSpy });
    const comp = fixture.componentInstance as any;
    expect(listSpy).toHaveBeenCalledWith('42');
    expect(comp.versions()).toHaveLength(LORE_HISTORY_MOCK.length);
    expect(comp.loading()).toBe(false);
  });

  it('para de carregar mesmo quando list() falha', () => {
    const fixture = createFixture({ list: vi.fn(() => throwError(() => ({ status: 500 }))) });
    const comp = fixture.componentInstance as any;
    expect(comp.loading()).toBe(false);
    expect(comp.versions()).toHaveLength(0);
  });

  it('current() aponta para a versão com status current', () => {
    const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
    const comp = fixture.componentInstance as any;
    expect(comp.current()?.versionNumber).toBe(3);
    expect(comp.current()?.status).toBe('current');
  });

  it('current() retorna null quando não há versões', () => {
    const fixture = createFixture({ list: vi.fn(() => of([])) });
    const comp = fixture.componentInstance as any;
    expect(comp.current()).toBeNull();
  });

  describe('revert()', () => {
    it('adiciona nova versão e exibe toast de sucesso ao reverter', () => {
      const newVersion = { ...LORE_HISTORY_MOCK[2], versionNumber: 4, status: 'current' as const };
      const svcMock = {
        list: vi.fn(() => of(LORE_HISTORY_MOCK)),
        revert: vi.fn(() => of(newVersion)),
      };
      const fixture = createFixture(svcMock);
      const comp = fixture.componentInstance as any;
      comp.revert(LORE_HISTORY_MOCK[2]);
      expect(svcMock.revert).toHaveBeenCalledWith('42', LORE_HISTORY_MOCK[2].versionNumber);
      expect(TOAST_MOCK.success).toHaveBeenCalled();
    });

    it('exibe toast de erro 403 ao reverter', () => {
      const svcMock = {
        list: vi.fn(() => of(LORE_HISTORY_MOCK)),
        revert: vi.fn(() => throwError(() => ({ status: 403 }))),
      };
      const fixture = createFixture(svcMock);
      const comp = fixture.componentInstance as any;
      comp.revert(LORE_HISTORY_MOCK[2]);
      expect(TOAST_MOCK.error).toHaveBeenCalled();
      expect(comp.reverting()).toBeNull();
    });

    it('exibe toast de erro 404 ao reverter', () => {
      const svcMock = {
        list: vi.fn(() => of(LORE_HISTORY_MOCK)),
        revert: vi.fn(() => throwError(() => ({ status: 404 }))),
      };
      const fixture = createFixture(svcMock);
      const comp = fixture.componentInstance as any;
      comp.revert(LORE_HISTORY_MOCK[2]);
      expect(TOAST_MOCK.error).toHaveBeenCalled();
      expect(comp.reverting()).toBeNull();
    });
  });

  describe('toggleVote()', () => {
    it('registra voto e exibe toast de aviso', () => {
      const updated = { ...LORE_HISTORY_MOCK[0], revertVotes: 3, userHasVoted: true };
      const svcMock = {
        list: vi.fn(() => of(LORE_HISTORY_MOCK)),
        voteRevert: vi.fn(() => of(updated)),
      };
      const fixture = createFixture(svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleVote();
      expect(svcMock.voteRevert).toHaveBeenCalledWith('42');
      expect(TOAST_MOCK.warning).toHaveBeenCalled();
      expect(comp.voting()).toBe(false);
    });

    it('remove voto quando userHasVoted=true', () => {
      const votedVersion = { ...LORE_HISTORY_MOCK[0], userHasVoted: true };
      const versions = [votedVersion, ...LORE_HISTORY_MOCK.slice(1)];
      const updated = { ...votedVersion, revertVotes: 1, userHasVoted: false };
      const svcMock = {
        list: vi.fn(() => of(versions)),
        removeVoteRevert: vi.fn(() => of(updated)),
      };
      const fixture = createFixture(svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleVote();
      expect(svcMock.removeVoteRevert).toHaveBeenCalledWith('42');
      expect(comp.voting()).toBe(false);
    });

    it('não faz nada quando não há versão current', () => {
      const versions = LORE_HISTORY_MOCK.map((v) => ({ ...v, status: 'active' as const }));
      const svcMock = {
        list: vi.fn(() => of(versions)),
        voteRevert: vi.fn(() => of({} as any)),
      };
      const fixture = createFixture(svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleVote();
      expect(svcMock.voteRevert).not.toHaveBeenCalled();
    });

    it('exibe toast de erro 409 ao votar duas vezes', () => {
      const svcMock = {
        list: vi.fn(() => of(LORE_HISTORY_MOCK)),
        voteRevert: vi.fn(() => throwError(() => ({ status: 409 }))),
      };
      const fixture = createFixture(svcMock);
      const comp = fixture.componentInstance as any;
      comp.toggleVote();
      expect(TOAST_MOCK.error).toHaveBeenCalled();
      expect(comp.voting()).toBe(false);
    });
  });

  describe('votePercent()', () => {
    it('calcula a porcentagem corretamente', () => {
      const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
      const comp = fixture.componentInstance as any;
      expect(comp.votePercent({ revertVotes: 2, revertVotesNeeded: 5 })).toBe(40);
    });

    it('retorna 0 quando revertVotesNeeded é 0', () => {
      const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
      const comp = fixture.componentInstance as any;
      expect(comp.votePercent({ revertVotes: 2, revertVotesNeeded: 0 })).toBe(0);
    });

    it('limita a 100% mesmo com votos excedentes', () => {
      const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
      const comp = fixture.componentInstance as any;
      expect(comp.votePercent({ revertVotes: 10, revertVotesNeeded: 5 })).toBe(100);
    });
  });

  describe('formatDate()', () => {
    it('exibe minutos para datas recentes', () => {
      const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
      const comp = fixture.componentInstance as any;
      const now = new Date(Date.now() - 45 * 60000).toISOString();
      expect(comp.formatDate(now)).toContain('min');
    });

    it('exibe horas para datas de horas atrás', () => {
      const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
      const comp = fixture.componentInstance as any;
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      expect(comp.formatDate(twoHoursAgo)).toContain('h');
    });

    it('exibe dias para datas de dias atrás', () => {
      const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
      const comp = fixture.componentInstance as any;
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600000).toISOString();
      expect(comp.formatDate(threeDaysAgo)).toContain('dia');
    });
  });

  it('initials() retorna as duas primeiras letras em maiúsculo', () => {
    const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
    const comp = fixture.componentInstance as any;
    expect(comp.initials('vincruz')).toBe('VI');
    expect(comp.initials('troll_xd')).toBe('TR');
  });
});
