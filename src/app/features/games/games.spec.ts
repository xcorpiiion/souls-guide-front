import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { Games } from './games';
import { GameService } from '../../core/services/game.service';
import { GameSeriesService } from '../../core/services/game-series.service';
import { GameSummary } from '../../shared/models/game.model';
import { GameSeries } from '../../shared/models/game-series.model';

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
    ref: '1',
    name: 'Elden Ring',
    shortName: 'ER',
    accentClass: 'a',
    genre: 'SOULS_LIKE',
    seriesName: null,
    seriesSlug: null,
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
    ref: '2',
    name: 'Silent Hill 2 (2001)',
    shortName: 'SI',
    accentClass: 'a',
    genre: 'PSYCHOLOGICAL_HORROR',
    seriesName: 'Silent Hill',
    seriesSlug: 'silent-hill',
    questCount: 3,
    loreCount: 1,
    followersCount: 1500,
    contributorsCount: 8,
    topQuestTitle: null,
    topQuestSteps: null,
    topQuestFollowers: null,
    lastActivityLabel: '—',
  },
];

const MOCK_SERIES: GameSeries[] = [
  {
    id: 6,
    slug: 'silent-hill',
    name: 'Silent Hill',
    description: null,
    imageUrl: null,
    gameCount: 10,
  },
  {
    id: 5,
    slug: 'resident-evil',
    name: 'Resident Evil',
    description: null,
    imageUrl: null,
    gameCount: 13,
  },
];

const gameServiceMock = {
  list: vi.fn(() => of(makePage(MOCK_GAMES, 2, 1))),
};

const seriesServiceMock = {
  list: vi.fn(() => of(MOCK_SERIES)),
};

async function setup(page = makePage(MOCK_GAMES, 2, 1)) {
  gameServiceMock.list.mockReturnValue(of(page));

  await TestBed.configureTestingModule({
    imports: [Games],
    providers: [
      provideRouter([]),
      { provide: GameService, useValue: gameServiceMock },
      { provide: GameSeriesService, useValue: seriesServiceMock },
    ],
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
    seriesServiceMock.list.mockReturnValue(of(MOCK_SERIES));
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
    const titles = Array.from(fixture.nativeElement.querySelectorAll('.game-card__title')).map(
      (el: any) => el.textContent?.trim(),
    );
    expect(titles).toContain('Elden Ring');
    expect(titles).toContain('Silent Hill 2 (2001)');
  });

  it('exibe o total de elementos no eyebrow', async () => {
    const { fixture } = await setup();
    const eyebrow: HTMLElement = fixture.nativeElement.querySelector('.games__eyebrow');
    expect(eyebrow.textContent).toContain('2');
  });

  it('chama list() com o termo ao buscar', async () => {
    const { component } = await setup();
    gameServiceMock.list.mockClear();
    gameServiceMock.list.mockReturnValue(of(makePage([])));

    component.onSearchInput('souls');
    vi.advanceTimersByTime(300);

    expect(gameServiceMock.list).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'souls', page: 0 }),
    );
  });

  describe('gênero', () => {
    it('manda o gênero escolhido para o servidor', async () => {
      const { component } = await setup();
      gameServiceMock.list.mockClear();

      component.onGenre('PSYCHOLOGICAL_HORROR');
      vi.advanceTimersByTime(1);

      expect(gameServiceMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ genre: 'PSYCHOLOGICAL_HORROR' }),
      );
    });

    /** É como um chip se desmarca: clicar no que já está ativo desliga o filtro. */
    it('clicar no chip ativo desliga o filtro', async () => {
      const { component } = await setup();
      component.onGenre('SOULS_LIKE');
      vi.advanceTimersByTime(1);
      gameServiceMock.list.mockClear();

      component.onGenre('SOULS_LIKE');
      vi.advanceTimersByTime(1);

      expect(gameServiceMock.list).toHaveBeenCalledWith(expect.objectContaining({ genre: null }));
    });

    /**
     * O chip dispara na hora; só a digitação espera. 300ms num clique é lentidão
     * perceptível, e não há tecla seguinte para agrupar.
     */
    it('não espera o debounce da busca', async () => {
      const { component } = await setup();
      gameServiceMock.list.mockClear();

      component.onGenre('SURVIVAL_HORROR');
      vi.advanceTimersByTime(1);

      expect(gameServiceMock.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('série', () => {
    it('exibe um chip por série', async () => {
      const { fixture } = await setup();
      const chips = Array.from(
        fixture.nativeElement.querySelectorAll('.games__filter-row--scroll .games__chip'),
      ).map((el: any) => el.textContent?.trim());
      expect(chips).toContain('Silent Hill');
      expect(chips).toContain('Resident Evil');
    });

    it('manda o seriesId escolhido para o servidor', async () => {
      const { component } = await setup();
      gameServiceMock.list.mockClear();

      component.onSeries(6);
      vi.advanceTimersByTime(1);

      expect(gameServiceMock.list).toHaveBeenCalledWith(expect.objectContaining({ seriesId: 6 }));
    });

    /**
     * A lista de jogos é o conteúdo da página; o filtro de série é um atalho para ela.
     * Falhar em carregar as séries não pode apagar o catálogo da tela.
     */
    it('a tela continua inteira quando as séries não carregam', async () => {
      seriesServiceMock.list.mockReturnValue(throwError(() => new Error('offline')));

      const { fixture } = await setup();

      expect(fixture.nativeElement.querySelectorAll('.game-card').length).toBe(MOCK_GAMES.length);
      expect(fixture.nativeElement.querySelector('.games__filter-row--scroll')).toBeNull();
    });
  });

  describe('mostrar mais', () => {
    it('não aparece quando tudo já está na tela', async () => {
      const { fixture } = await setup(makePage(MOCK_GAMES, 2, 1));
      expect(fixture.nativeElement.querySelector('.games__more-btn')).toBeNull();
    });

    it('aparece quando o total é maior do que o carregado', async () => {
      const { fixture } = await setup(makePage(MOCK_GAMES, 24, 2));
      expect(fixture.nativeElement.querySelector('.games__more-btn')).not.toBeNull();
    });

    /** Acrescenta ao que está na tela; trocar a lista perderia o que já foi lido. */
    it('acrescenta a página seguinte em vez de trocar a lista', async () => {
      const { component, fixture } = await setup(makePage(MOCK_GAMES, 24, 2));
      gameServiceMock.list.mockReturnValue(
        of(makePage([{ ...MOCK_GAMES[0], id: '3', name: 'Bloodborne' }], 24, 2)),
      );

      component.onLoadMore();
      vi.advanceTimersByTime(1);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.game-card').length).toBe(3);
      expect(gameServiceMock.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
    });

    /** Filtro novo volta para a primeira página — senão a tela abriria no meio. */
    it('trocar o filtro volta para a página 0', async () => {
      const { component } = await setup(makePage(MOCK_GAMES, 24, 2));
      component.onLoadMore();
      vi.advanceTimersByTime(1);
      gameServiceMock.list.mockClear();

      component.onGenre('SOULS_LIKE');
      vi.advanceTimersByTime(1);

      expect(gameServiceMock.list).toHaveBeenCalledWith(expect.objectContaining({ page: 0 }));
    });
  });

  it('mostra o estado vazio quando nada é encontrado', async () => {
    const { fixture } = await setup(makePage([], 0, 0));
    expect(fixture.nativeElement.querySelector('.games__empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.game-card').length).toBe(0);
  });
});
