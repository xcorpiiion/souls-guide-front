import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { of } from 'rxjs';
import { Home } from './home';
import { GameService } from '../../core/services/game.service';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';
import { QuestSummary } from '../../shared/models/quest.model';
import { LoreSummary } from '../../shared/models/lore-article.model';
import { FeaturedGame } from '../../shared/models/game.model';

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
    followers: 0,
    author: null,
  },
  {
    id: '2',
    title: 'Questline de Fia',
    gameId: '1',
    gameName: 'Elden Ring',
    stepCount: 3,
    forkCount: 0,
    endingCount: 1,
    status: 'CONSOLIDADO',
    followers: 0,
    author: null,
  },
  {
    id: '3',
    title: 'Questline do Gehrman',
    gameId: '2',
    gameName: 'Bloodborne',
    stepCount: 4,
    forkCount: 1,
    endingCount: 3,
    status: 'CANONICO',
    followers: 0,
    author: null,
  },
];

const MOCK_LORE: LoreSummary[] = [
  {
    id: '1',
    title: 'Ranni, a Bruxa das Estrelas',
    gameId: '1',
    gameName: 'Elden Ring',
    category: 'CHARACTER',
    status: 'CANONICO',
    excerpt: '...',
    votes: 0,
    author: 'u',
    readMinutes: 5,
    tags: [],
  },
  {
    id: '2',
    title: 'O Plano da Lua',
    gameId: '1',
    gameName: 'Elden Ring',
    category: 'WORLD',
    status: 'CONSOLIDADO',
    excerpt: '...',
    votes: 0,
    author: 'u',
    readMinutes: 3,
    tags: [],
  },
];

const MOCK_FEATURED: FeaturedGame[] = [
  { id: 1, name: 'Elden Ring', shortName: 'er', questCount: 10, loreCount: 5 },
  { id: 2, name: 'Bloodborne', shortName: 'bb', questCount: 4, loreCount: 2 },
];

const PAGE_STUB_QUESTS = {
  content: MOCK_QUESTS,
  totalElements: 3,
  totalPages: 1,
  number: 0,
  size: 20,
  first: true,
  last: true,
};
const PAGE_STUB_LORE = {
  content: MOCK_LORE,
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 12,
  first: true,
  last: true,
};
const PAGE_STUB_TOTAL = {
  content: [],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 1,
  first: true,
  last: true,
};

function createFixture(): ComponentFixture<Home> {
  TestBed.configureTestingModule({
    imports: [Home],
    providers: [
      provideRouter([]),
      {
        provide: GameService,
        useValue: { getFeatured: () => of(MOCK_FEATURED), list: () => of(PAGE_STUB_TOTAL) },
      },
      { provide: QuestService, useValue: { list: () => of(PAGE_STUB_QUESTS) } },
      { provide: LoreService, useValue: { list: () => of(PAGE_STUB_LORE) } },
    ],
  });
  const fixture = TestBed.createComponent(Home);
  fixture.detectChanges();
  return fixture;
}

describe('Home', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir todas as quests sem filtro', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as unknown as { filteredQuests: () => unknown[] };
    expect(comp.filteredQuests().length).toBeGreaterThan(0);
  });

  it('deve filtrar quests por jogo selecionado', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as unknown as {
      filteredQuests: () => { gameId: string }[];
      toggleGame: (id: number) => void;
    };
    comp.toggleGame(1);
    const quests = comp.filteredQuests();
    expect(quests.length).toBeGreaterThan(0);
    expect(quests.every((q) => q.gameId === '1')).toBe(true);
  });

  it('deve desmarcar jogo ao clicar duas vezes', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as unknown as {
      filteredQuests: () => unknown[];
      selectedGameId: () => number | null;
      toggleGame: (id: number) => void;
    };
    comp.toggleGame(1);
    comp.toggleGame(1);
    expect(comp.selectedGameId()).toBeNull();
  });

  it('deve filtrar quests por termo de busca', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as unknown as {
      filteredQuests: () => { title: string }[];
      onSearch: (term: string) => void;
    };
    comp.onSearch('Ranni');
    const quests = comp.filteredQuests();
    expect(quests.every((q) => q.title.toLowerCase().includes('ranni'))).toBe(true);
  });

  it('deve retornar lista vazia quando busca não tem resultado', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as unknown as {
      filteredQuests: () => unknown[];
      onSearch: (term: string) => void;
    };
    comp.onSearch('xpto123inexistente');
    expect(comp.filteredQuests()).toHaveLength(0);
  });

  it('deve exibir máximo 5 quests', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as unknown as { filteredQuests: () => unknown[] };
    expect(comp.filteredQuests().length).toBeLessThanOrEqual(5);
  });

  it('deve exibir máximo 4 artigos de lore', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as unknown as { filteredLore: () => unknown[] };
    expect(comp.filteredLore().length).toBeLessThanOrEqual(4);
  });

  it('loreBadgeLabel retorna o rótulo correto', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as unknown as {
      loreBadgeLabel: (status: string) => string;
    };
    expect(comp.loreBadgeLabel('CANONICO')).toBe('Canônico');
    expect(comp.loreBadgeLabel('CONSOLIDADO')).toBe('Consolidado');
    expect(comp.loreBadgeLabel('TEORIA')).toBe('Teoria');
  });
});
