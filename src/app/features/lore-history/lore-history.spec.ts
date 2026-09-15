import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { LoreHistory } from './lore-history';
import { LoreVersionService } from '../../core/services/lore-version.service';
import { LoreService } from '../../core/services/lore.service';
import { AuthService } from '@xcorpiiion/ng-core';
import { ToastService } from '@xcorpiiion/ui';
import { LORE_HISTORY_MOCK } from './lore-history.mocks';

function makeAuth(loggedIn: boolean, userId: string) {
  return { isLoggedIn: () => loggedIn, userId: () => userId } as unknown as AuthService;
}

const TOAST_MOCK = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };

/** A lore 42 é de quem tem id 1. */
const ARTIGO = { id: 42, userId: '1', ownerId: null, isPersonal: false };

function createFixture(
  versionSvcMock: Partial<LoreVersionService>,
  loggedIn = true,
  userId = '1',
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
      { provide: AuthService, useValue: makeAuth(loggedIn, userId) },
      { provide: LoreService, useValue: { get: vi.fn(() => of(ARTIGO)) } },
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

  /** ADR 0034 do souls-guide-api: publicada, todos leem; só o autor altera. */
  describe('quem não é o autor', () => {
    it('não vê "reverter para esta", nem votação, e é mandado à denúncia', () => {
      const svcMock = { list: vi.fn(() => of(LORE_HISTORY_MOCK)), revert: vi.fn() };
      const fixture = createFixture(svcMock, true, '99');
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('reverter para esta');
      expect(el.textContent).not.toContain('votar para reverter');
      expect(el.textContent).toContain('só o autor altera esta lore');
      expect(el.textContent).toContain('denunciar');

      (fixture.componentInstance as any).revert(LORE_HISTORY_MOCK[2]);
      expect(svcMock.revert).not.toHaveBeenCalled();
    });

    it('o autor vê o botão de reverter', () => {
      const fixture = createFixture({ list: vi.fn(() => of(LORE_HISTORY_MOCK)) });
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('reverter para esta');
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
