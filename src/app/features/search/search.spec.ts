import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Search } from './search';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';
import { QuestSummary } from '../../shared/models/quest.model';
import { LoreSummary } from '../../shared/models/lore-article.model';

const QUEST_RANNI: QuestSummary = {
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
};

const LORE_GEHRMAN: LoreSummary = {
  id: '1',
  title: 'Gehrman, o Primeiro Caçador',
  gameId: '2',
  gameName: 'Bloodborne',
  category: 'CHARACTER',
  status: 'CANONICO',
  excerpt: '...',
  votes: 0,
  author: 'u',
  readMinutes: 3,
  tags: [],
};

function makeRoute(q: string) {
  return {
    queryParamMap: of({ get: (key: string) => (key === 'q' ? q : null) }),
  };
}

interface SearchComp {
  query: () => string;
  questResults: () => QuestSummary[];
  loreResults: () => LoreSummary[];
}

describe('Search', () => {
  let fixture: ComponentFixture<Search>;
  let comp: SearchComp;

  afterEach(() => vi.useRealTimers());

  async function setup(
    q: string,
    questResults: QuestSummary[] = [],
    loreResults: LoreSummary[] = [],
  ) {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [Search],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: makeRoute(q) },
        { provide: QuestService, useValue: { search: vi.fn(() => of(questResults)) } },
        { provide: LoreService, useValue: { search: vi.fn(() => of(loreResults)) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Search);
    comp = fixture.componentInstance as unknown as SearchComp;
    fixture.detectChanges();
    vi.advanceTimersByTime(350);
    fixture.detectChanges();
  }

  it('deve criar o componente com query vazia', async () => {
    await setup('');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('query() reflete o parâmetro da rota', async () => {
    await setup('Ranni');
    expect(comp.query()).toBe('Ranni');
  });

  it('busca vazia retorna zero resultados', async () => {
    await setup('');
    expect(comp.questResults()).toHaveLength(0);
    expect(comp.loreResults()).toHaveLength(0);
  });

  it('filtra quests pelo título', async () => {
    await setup('ranni', [QUEST_RANNI]);
    expect(comp.questResults().length).toBeGreaterThan(0);
    expect(
      comp
        .questResults()
        .every(
          (q) =>
            q.title.toLowerCase().includes('ranni') ||
            (q.description ?? '').toLowerCase().includes('ranni'),
        ),
    ).toBe(true);
  });

  it('filtra artigos de lore pelo título', async () => {
    await setup('gehrman', [], [LORE_GEHRMAN]);
    expect(comp.loreResults().length).toBeGreaterThan(0);
  });

  it('termo sem resultado retorna arrays vazios', async () => {
    await setup('xxxxinexistente9999');
    expect(comp.questResults()).toHaveLength(0);
    expect(comp.loreResults()).toHaveLength(0);
  });

  it('busca é case-insensitive', async () => {
    await setup('RANNI', [QUEST_RANNI]);
    expect(comp.questResults().length).toBeGreaterThan(0);
  });
});
