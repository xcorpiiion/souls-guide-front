import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { GameDetail } from './game-detail';
import { GAMES_DETAIL } from './game-detail.mocks';

function createFixture(gameId: string): ComponentFixture<GameDetail> {
  TestBed.configureTestingModule({
    imports: [GameDetail],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: gameId }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(GameDetail);
  fixture.detectChanges();
  return fixture;
}

describe('GameDetail', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture('elden-ring');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir o nome do jogo correto', () => {
    const fixture = createFixture('elden-ring');
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('.game-detail__name')?.textContent?.trim()).toBe('Elden Ring');
  });

  it('deve exibir subtítulo com developer, ano e gênero', () => {
    const fixture = createFixture('elden-ring');
    const compiled: HTMLElement = fixture.nativeElement;
    const subtitle = compiled.querySelector('.game-detail__subtitle')?.textContent ?? '';
    expect(subtitle).toContain('FromSoftware');
    expect(subtitle).toContain('2022');
  });

  it('deve exibir as 4 stats do jogo', () => {
    const fixture = createFixture('elden-ring');
    const compiled: HTMLElement = fixture.nativeElement;
    const stats = compiled.querySelectorAll('.game-detail__stat');
    expect(stats.length).toBe(4);
  });

  it('deve exibir a aba de quests ativa por padrão', () => {
    const fixture = createFixture('elden-ring');
    const compiled: HTMLElement = fixture.nativeElement;
    const activeTab = compiled.querySelector('.game-detail__tab--active');
    expect(activeTab?.textContent?.trim()).toContain('quests');
  });

  it('deve exibir a lista de quests na aba padrão', () => {
    const fixture = createFixture('elden-ring');
    const compiled: HTMLElement = fixture.nativeElement;
    const questCards = compiled.querySelectorAll('.game-detail__quest-card');
    const eldenRing = GAMES_DETAIL.find((g) => g.id === 'elden-ring')!;
    expect(questCards.length).toBe(eldenRing.quests.length);
  });

  it('deve mudar para aba de lore ao clicar', () => {
    const fixture = createFixture('elden-ring');
    const compiled: HTMLElement = fixture.nativeElement;
    const tabs = Array.from(compiled.querySelectorAll('.game-detail__tab')) as HTMLButtonElement[];
    const loreTab = tabs.find((t) => t.textContent?.includes('lore'));
    loreTab?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance['activeTab']()).toBe('lore');
  });

  it('deve exibir cards de lore após mudar para aba de lore', () => {
    const fixture = createFixture('elden-ring');
    const tabs = Array.from(
      fixture.nativeElement.querySelectorAll('.game-detail__tab'),
    ) as HTMLButtonElement[];
    tabs.find((t) => t.textContent?.includes('lore'))?.click();
    fixture.detectChanges();
    const loreCards = fixture.nativeElement.querySelectorAll('.game-detail__lore-card');
    const eldenRing = GAMES_DETAIL.find((g) => g.id === 'elden-ring')!;
    expect(loreCards.length).toBe(eldenRing.featuredLore.length);
  });

  it('deve filtrar quests por status ao clicar no filtro', () => {
    const fixture = createFixture('elden-ring');
    const compiled: HTMLElement = fixture.nativeElement;
    const pills = Array.from(
      compiled.querySelectorAll('.game-detail__filter-pill'),
    ) as HTMLButtonElement[];
    const teoriaPill = pills.find((p) => p.textContent?.includes('teoria'));
    teoriaPill?.click();
    fixture.detectChanges();
    const questCards = compiled.querySelectorAll('.game-detail__quest-card');
    const teoriaCount = GAMES_DETAIL.find((g) => g.id === 'elden-ring')!.quests.filter(
      (q) => q.status === 'TEORIA',
    ).length;
    expect(questCards.length).toBe(teoriaCount);
  });

  it('deve exibir filtro "todos" ativo por padrão', () => {
    const fixture = createFixture('elden-ring');
    const compiled: HTMLElement = fixture.nativeElement;
    const activePill = compiled.querySelector('.game-detail__filter-pill--active');
    expect(activePill?.textContent?.trim()).toBe('todos');
  });

  it('deve exibir mensagem de não encontrado para id inválido', () => {
    const fixture = createFixture('jogo-inexistente');
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('.game-detail__not-found')).toBeTruthy();
    expect(compiled.querySelector('.game-detail')).toBeFalsy();
  });

  it('deve exibir o badge com a sigla do jogo', () => {
    const fixture = createFixture('bloodborne');
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('.game-detail__badge')?.textContent?.trim()).toBe('BB');
  });
});
