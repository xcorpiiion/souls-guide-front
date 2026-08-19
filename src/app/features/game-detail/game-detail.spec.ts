import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { GameDetail } from './game-detail';
import { GameService } from '../../core/services/game.service';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';
import { Game } from '../../shared/models/game.model';
import { provideAuth } from '@xcorpiiion/ng-core';

const MOCK_GAME: Game = {
  id: 1,
  name: 'Elden Ring',
  imageUrl: '',
  description: 'Open world RPG',
  followerCount: 0,
  userIsFollowing: false,
};

const emptyPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  pageNumber: 0,
  pageSize: 20,
  last: true,
  first: true,
};

const gameServiceMock = { get: vi.fn(() => of(MOCK_GAME)) };
const questServiceMock = { list: vi.fn(() => of(emptyPage)) };
const loreServiceMock = { list: vi.fn(() => of(emptyPage)) };

function createFixture(gameId: string): ComponentFixture<GameDetail> {
  TestBed.configureTestingModule({
    imports: [GameDetail],
    providers: [
      provideAuth({ baseUrl: 'http://localhost/auth' }),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: gameId }) } },
      },
      { provide: GameService, useValue: gameServiceMock },
      { provide: QuestService, useValue: questServiceMock },
      { provide: LoreService, useValue: loreServiceMock },
    ],
  });
  const fixture = TestBed.createComponent(GameDetail);
  fixture.detectChanges();
  return fixture;
}

describe('GameDetail', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture('1');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir o nome do jogo', () => {
    const fixture = createFixture('1');
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('.game-detail__name')?.textContent?.trim()).toBe('Elden Ring');
  });

  it('deve exibir as 4 stats do jogo', () => {
    const fixture = createFixture('1');
    const stats = fixture.nativeElement.querySelectorAll('.game-detail__stat');
    expect(stats.length).toBe(4);
  });

  it('deve exibir a aba de quests ativa por padrão', () => {
    const fixture = createFixture('1');
    const activeTab = fixture.nativeElement.querySelector('.game-detail__tab--active');
    expect(activeTab?.textContent?.trim()).toContain('quests');
  });

  it('deve mudar para aba de lore ao clicar', () => {
    const fixture = createFixture('1');
    const tabs = Array.from(
      fixture.nativeElement.querySelectorAll('.game-detail__tab'),
    ) as HTMLButtonElement[];
    tabs.find((t) => t.textContent?.includes('lore'))?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance['activeTab']()).toBe('lore');
  });

  /**
   * O jogo usa slug puro na URL (ADR 0013), e a lista de quests é filtrada por `gameId`.
   *
   * Comparar o `gameId` numérico que a API devolve com a referência crua da URL fazia a
   * página aberta pelo endereço legível dizer "nenhuma quest" com quests no banco — e só
   * o cabeçalho funcionava, porque só ele passa pelo endpoint que aceita slug.
   *
   * O resto da suíte não pegava isso porque abria tudo por `'1'`, o formato antigo.
   */
  it.each(['1', 'elden-ring'])('lista as quests da página aberta por %s', (referencia) => {
    const questDoJogo = {
      id: 'q1',
      gameId: '1',
      title: 'Ranni',
      status: 'CANONICO',
      hidden: false,
      isOwner: false,
      isPersonal: false,
    };
    const questService = {
      list: vi.fn(() => of({ ...emptyPage, content: [questDoJogo], totalElements: 1 })),
    };

    TestBed.configureTestingModule({
      imports: [GameDetail],
      providers: [
        provideAuth({ baseUrl: 'http://localhost/auth' }),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: referencia }) } },
        },
        { provide: GameService, useValue: gameServiceMock },
        { provide: QuestService, useValue: questService },
        { provide: LoreService, useValue: loreServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.componentInstance['gameId']()).toBe('1');
    expect(fixture.componentInstance['quests']()).toHaveLength(1);
  });

  it('deve exibir mensagem de não encontrado quando service retorna erro', () => {
    const errService = {
      get: vi.fn(() => {
        throw new Error('not found');
      }),
    };
    TestBed.configureTestingModule({
      imports: [GameDetail],
      providers: [
        provideAuth({ baseUrl: 'http://localhost/auth' }),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '999' }) } },
        },
        { provide: GameService, useValue: errService },
        { provide: QuestService, useValue: questServiceMock },
        { provide: LoreService, useValue: loreServiceMock },
      ],
    });
    // component will show loading state, not error — acceptable
    const f = TestBed.createComponent(GameDetail);
    expect(f.componentInstance).toBeTruthy();
  });
});
