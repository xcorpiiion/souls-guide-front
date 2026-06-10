import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { Games } from './games';
import { GAMES_SUMMARY } from './games.mocks';

describe('Games', () => {
  let fixture: ComponentFixture<Games>;
  let component: Games;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Games],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Games);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir todos os jogos dos mocks', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const cards = compiled.querySelectorAll('.game-card');
    expect(cards.length).toBe(GAMES_SUMMARY.length);
  });

  it('deve exibir o nome de cada jogo', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const badges = compiled.querySelectorAll('.game-card__badge');
    const names = Array.from(badges).map((el) => el.textContent?.trim());
    expect(names).toContain('Elden Ring');
    expect(names).toContain('Bloodborne');
    expect(names).toContain('Lords of the Fallen');
  });

  it('deve exibir mensagem de vazio quando não há quest top', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const emptyMessages = compiled.querySelectorAll('.game-card__top-quest-empty');
    const lotfMock = GAMES_SUMMARY.find((g) => g.topQuestTitle === null);
    expect(emptyMessages.length).toBe(lotfMock ? 1 : 0);
  });

  it('deve exibir estatísticas de cada jogo', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const statValues = compiled.querySelectorAll('.game-card__stat-value');
    expect(statValues.length).toBeGreaterThan(0);
  });
});
