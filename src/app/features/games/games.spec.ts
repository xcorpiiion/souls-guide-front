import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { Games } from './games';
import { GameService } from '../../core/services/game.service';
import { GameSummary } from '../../shared/models/game.model';

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
  list: vi.fn(() =>
    of({
      content: MOCK_GAMES,
      totalElements: 2,
      totalPages: 1,
      pageNumber: 0,
      pageSize: 20,
      last: true,
      first: true,
    }),
  ),
};

describe('Games', () => {
  let fixture: ComponentFixture<Games>;
  let component: Games;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Games],
      providers: [provideRouter([]), { provide: GameService, useValue: gameServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(Games);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir os jogos retornados pelo service', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const cards = compiled.querySelectorAll('.game-card');
    expect(cards.length).toBe(MOCK_GAMES.length);
  });

  it('deve exibir o nome de cada jogo', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const badges = compiled.querySelectorAll('.game-card__badge');
    const names = Array.from(badges).map((el) => el.textContent?.trim());
    expect(names).toContain('Elden Ring');
    expect(names).toContain('Bloodborne');
  });
});
