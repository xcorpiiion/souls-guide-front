import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { Games } from './games';
import { GameService } from '../../core/services/game.service';
import { GameSummary } from '../../shared/models/game.model';

const makePage = (games: GameSummary[], total = games.length, pages = 1) => ({
  content: games,
  totalElements: total,
  totalPages: pages,
  number: 0,
  size: 12,
  first: true,
  last: pages === 1,
});

const MOCK_GAMES: GameSummary[] = [
  {
    id: '1',
    name: 'Elden Ring',
    shortName: 'ER',
    accentClass: 'a',
    questCount: 5,
    loreCount: 2,
    followersCount: 100,
    contributorsCount: 10,
    topQuestTitle: 'Ranni',
    topQuestSteps: 7,
    topQuestFollowers: 4800,
    lastActivityLabel: 'hoje',
  },
  {
    id: '2',
    name: 'Bloodborne',
    shortName: 'BB',
    accentClass: 'a',
    questCount: 3,
    loreCount: 1,
    followersCount: 80,
    contributorsCount: 8,
    topQuestTitle: null,
    topQuestSteps: null,
    topQuestFollowers: null,
    lastActivityLabel: '—',
  },
];

const gameServiceMock = {
  list: vi.fn(() => of(makePage(MOCK_GAMES, 2, 1))),
};

async function setup(page = makePage(MOCK_GAMES, 2, 1)) {
  gameServiceMock.list.mockReturnValue(of(page));

  await TestBed.configureTestingModule({
    imports: [Games],
    providers: [provideRouter([]), { provide: GameService, useValue: gameServiceMock }],
  }).compileComponents();

  const fixture: ComponentFixture<Games> = TestBed.createComponent(Games);
  const component = fixture.componentInstance as any;
  fixture.detectChanges();
  vi.advanceTimersByTime(300);
  fixture.detectChanges();
  return { fixture, component };
}

describe('Games', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gameServiceMock.list.mockReturnValue(of(makePage(MOCK_GAMES, 2, 1)));
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('deve criar o componente', async () => {
    const { component } = await setup();
    expect(component).toBeTruthy();
  });

  it('exibe os jogos após carregar', async () => {
    const { fixture } = await setup();
    const cards = fixture.nativeElement.querySelectorAll('.game-card');
    expect(cards.length).toBe(MOCK_GAMES.length);
  });

  it('exibe o nome de cada jogo', async () => {
    const { fixture } = await setup();
    const badges = fixture.nativeElement.querySelectorAll('.game-card__badge');
    const names = Array.from(badges).map((el: any) => el.textContent?.trim());
    expect(names).toContain('Elden Ring');
    expect(names).toContain('Bloodborne');
  });

  it('exibe o total de elementos no eyebrow', async () => {
    const { fixture } = await setup();
    const eyebrow: HTMLElement = fixture.nativeElement.querySelector('.games__eyebrow');
    expect(eyebrow.textContent).toContain('2');
  });

  it('não exibe paginação com 1 página', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('.games__pagination')).toBeNull();
  });

  it('exibe paginação com totalPages > 1', async () => {
    const { fixture } = await setup(makePage(MOCK_GAMES, 24, 2));
    expect(fixture.nativeElement.querySelector('.games__pagination')).not.toBeNull();
  });

  it('chama list() com term ao buscar', async () => {
    const { component } = await setup();
    gameServiceMock.list.mockClear();
    gameServiceMock.list.mockReturnValue(of(makePage([])));
    component.onSearchInput('souls');
    vi.advanceTimersByTime(300);
    expect(gameServiceMock.list).toHaveBeenCalledWith(0, 12, 'souls');
  });

  describe('pageNumbers()', () => {
    it('retorna sequência completa para totalPages <= 7', async () => {
      const { component } = await setup(makePage(MOCK_GAMES, 50, 5));
      expect(component.pageNumbers()).toEqual([0, 1, 2, 3, 4]);
    });

    it('insere ellipsis (-1) para muitas páginas', async () => {
      const { component } = await setup(makePage(MOCK_GAMES, 100, 10));
      const pages = component.pageNumbers();
      expect(pages).toContain(-1);
      expect(pages[0]).toBe(0);
      expect(pages[pages.length - 1]).toBe(9);
    });
  });
});
