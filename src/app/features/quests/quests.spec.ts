import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { Quests } from './quests';
import { QuestService } from '../../core/services/quest.service';
import { GameService } from '../../core/services/game.service';
import { QuestSummary } from '../../shared/models/quest.model';

const MOCK_QUESTS: QuestSummary[] = [
  {
    id: '1',
    title: 'Questline de Ranni',
    gameId: '1',
    gameName: 'Elden Ring',
    stepCount: 7,
    forkCount: 1,
    endingCount: 2,
    status: 'CANONICO',
    followers: 4800,
    author: 'vincruz',
    description: 'A bruxa das estrelas',
  },
  {
    id: '2',
    title: 'Investigação de Yharnam',
    gameId: '2',
    gameName: 'Bloodborne',
    stepCount: 4,
    forkCount: 0,
    endingCount: 3,
    status: 'CONSOLIDADO',
    followers: 980,
    author: null,
    description: 'A noite de caça',
  },
];

const makePage = (quests: QuestSummary[], total = quests.length, pages = 1) => ({
  content: quests,
  totalElements: total,
  totalPages: pages,
  number: 0,
  size: 10,
  first: true,
  last: pages === 1,
});

const questServiceMock = { list: vi.fn(() => of(makePage(MOCK_QUESTS))) };
const gameServiceMock = {
  search: vi.fn(() => of([])),
  list: vi.fn(() => of(makePage([] as any))),
};

async function setup(page = makePage(MOCK_QUESTS)) {
  questServiceMock.list.mockReturnValue(of(page));

  await TestBed.configureTestingModule({
    imports: [Quests],
    providers: [
      provideRouter([]),
      { provide: QuestService, useValue: questServiceMock },
      { provide: GameService, useValue: gameServiceMock },
    ],
  }).compileComponents();

  const fixture: ComponentFixture<Quests> = TestBed.createComponent(Quests);
  const component = fixture.componentInstance as any;
  fixture.detectChanges();
  vi.advanceTimersByTime(250);
  fixture.detectChanges();
  return { fixture, component };
}

describe('Quests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    questServiceMock.list.mockReturnValue(of(makePage(MOCK_QUESTS)));
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('deve criar o componente', async () => {
    const { component } = await setup();
    expect(component).toBeTruthy();
  });

  it('inicia em loading antes de carregar', async () => {
    await TestBed.configureTestingModule({
      imports: [Quests],
      providers: [
        provideRouter([]),
        { provide: QuestService, useValue: questServiceMock },
        { provide: GameService, useValue: gameServiceMock },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Quests);
    expect((fixture.componentInstance as any).loading()).toBe(true);
  });

  it('exibe quests após carregar', async () => {
    const { component } = await setup();
    expect(component.quests().length).toBe(MOCK_QUESTS.length);
    expect(component.loading()).toBe(false);
  });

  it('exibe totalElements correto', async () => {
    const { component } = await setup();
    expect(component.totalElements()).toBe(MOCK_QUESTS.length);
  });

  it('não exibe paginação com 1 página', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('.qs__pagination')).toBeNull();
  });

  it('exibe paginação com múltiplas páginas', async () => {
    const { fixture } = await setup(makePage(MOCK_QUESTS, 30, 3));
    expect(fixture.nativeElement.querySelector('.qs__pagination')).not.toBeNull();
  });

  it('setStatusFilter chama service com status correto e reseta página', async () => {
    const { component } = await setup();
    questServiceMock.list.mockClear();
    questServiceMock.list.mockReturnValue(of(makePage([])));
    component.setStatusFilter('CANONICO');
    vi.advanceTimersByTime(250);
    expect(questServiceMock.list).toHaveBeenCalledWith(0, 10, undefined, undefined, 'CANONICO');
    expect(component.currentPage()).toBe(0);
  });

  it('onSearchInput chama service com q correto', async () => {
    const { component } = await setup();
    questServiceMock.list.mockClear();
    questServiceMock.list.mockReturnValue(of(makePage([])));
    component.onSearchInput('ranni');
    vi.advanceTimersByTime(250);
    expect(questServiceMock.list).toHaveBeenCalledWith(0, 10, 'ranni', undefined, undefined);
  });

  it('goToPage atualiza currentPage e chama service', async () => {
    const { component } = await setup(makePage(MOCK_QUESTS, 30, 3));
    questServiceMock.list.mockClear();
    questServiceMock.list.mockReturnValue(of(makePage(MOCK_QUESTS, 30, 3)));
    component.goToPage(1);
    vi.advanceTimersByTime(250);
    expect(component.currentPage()).toBe(1);
    expect(questServiceMock.list).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined);
  });

  it('goToPage ignora página fora do intervalo', async () => {
    const { component } = await setup(makePage(MOCK_QUESTS, 10, 1));
    questServiceMock.list.mockClear();
    component.goToPage(-1);
    component.goToPage(5);
    vi.advanceTimersByTime(250);
    expect(questServiceMock.list).not.toHaveBeenCalled();
  });

  describe('statusLabel()', () => {
    it('mapeia todos os status', async () => {
      const { component } = await setup();
      expect(component.statusLabel('CANONICO')).toBe('canônico');
      expect(component.statusLabel('CONSOLIDADO')).toBe('consolidado');
      expect(component.statusLabel('TEORIA')).toBe('teoria');
    });
  });

  describe('followersLabel()', () => {
    it('formata números < 1000', async () => {
      const { component } = await setup();
      expect(component.followersLabel(0)).toBe('0');
      expect(component.followersLabel(999)).toBe('999');
    });

    it('formata milhares com k', async () => {
      const { component } = await setup();
      expect(component.followersLabel(1000)).toBe('1.0k');
      expect(component.followersLabel(4800)).toBe('4.8k');
    });
  });

  describe('pageNumbers()', () => {
    it('retorna sequência completa para totalPages <= 7', async () => {
      const { component } = await setup(makePage(MOCK_QUESTS, 50, 5));
      expect(component.pageNumbers()).toEqual([0, 1, 2, 3, 4]);
    });

    it('insere ellipsis para muitas páginas', async () => {
      const { component } = await setup(makePage(MOCK_QUESTS, 100, 10));
      const pages = component.pageNumbers();
      expect(pages).toContain(-1);
      expect(pages[0]).toBe(0);
      expect(pages[pages.length - 1]).toBe(9);
    });
  });
});
