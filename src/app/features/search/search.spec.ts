import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect } from 'vitest';
import { Search } from './search';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';
import { LORE_ARTICLES } from '../lore/lore.mocks';

function makeRoute(q: string) {
  return {
    queryParamMap: of({ get: (key: string) => (key === 'q' ? q : null) }),
  };
}

interface SearchComp {
  query: () => string;
  questResults: () => typeof QUESTS_DETAIL;
  loreResults: () => typeof LORE_ARTICLES;
}

describe('Search', () => {
  let fixture: ComponentFixture<Search>;
  let comp: SearchComp;

  async function setup(q: string) {
    await TestBed.configureTestingModule({
      imports: [Search],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: makeRoute(q) }],
    }).compileComponents();

    fixture = TestBed.createComponent(Search);
    comp = fixture.componentInstance as unknown as SearchComp;
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
    await setup('ranni');
    expect(comp.questResults().length).toBeGreaterThan(0);
    expect(
      comp
        .questResults()
        .every(
          (q) =>
            q.title.toLowerCase().includes('ranni') ||
            q.description.toLowerCase().includes('ranni'),
        ),
    ).toBe(true);
  });

  it('filtra artigos de lore pelo título', async () => {
    await setup('gehrman');
    expect(comp.loreResults().length).toBeGreaterThan(0);
  });

  it('termo sem resultado retorna arrays vazios', async () => {
    await setup('xxxxinexistente9999');
    expect(comp.questResults()).toHaveLength(0);
    expect(comp.loreResults()).toHaveLength(0);
  });

  it('busca é case-insensitive', async () => {
    await setup('RANNI');
    expect(comp.questResults().length).toBeGreaterThan(0);
  });
});
