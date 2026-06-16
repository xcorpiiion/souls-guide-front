import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { Lore } from './lore';
import { LoreService } from '../../core/services/lore.service';
import { LoreSummary } from '../../shared/models/lore-article.model';

const MOCK_LORE: LoreSummary[] = [
  {
    id: '1',
    title: 'Ranni, a Bruxa das Estrelas',
    gameId: '1',
    gameName: 'Elden Ring',
    category: 'CHARACTER',
    status: 'CANONICO',
    excerpt: 'Semideusa lunar',
    votes: 412,
    author: 'vincruz',
    readMinutes: 8,
    tags: ['lua'],
  },
  {
    id: '2',
    title: 'Farum Azula',
    gameId: '1',
    gameName: 'Elden Ring',
    category: 'WORLD',
    status: 'CANONICO',
    excerpt: 'Cidade fora do tempo',
    votes: 156,
    author: 'ds_wiki',
    readMinutes: 5,
    tags: ['dragões'],
  },
];

const makePage = (articles: LoreSummary[], total = articles.length, pages = 1) => ({
  content: articles,
  totalElements: total,
  totalPages: pages,
  number: 0,
  size: 12,
  first: true,
  last: pages === 1,
});

const loreServiceMock = { list: vi.fn(() => of(makePage(MOCK_LORE))) };

async function setup(page = makePage(MOCK_LORE)) {
  loreServiceMock.list.mockReturnValue(of(page));

  await TestBed.configureTestingModule({
    imports: [Lore],
    providers: [provideRouter([]), { provide: LoreService, useValue: loreServiceMock }],
  }).compileComponents();

  const fixture: ComponentFixture<Lore> = TestBed.createComponent(Lore);
  const component = fixture.componentInstance as any;
  fixture.detectChanges();
  vi.advanceTimersByTime(250);
  fixture.detectChanges();
  return { fixture, component };
}

describe('Lore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loreServiceMock.list.mockReturnValue(of(makePage(MOCK_LORE)));
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
      imports: [Lore],
      providers: [provideRouter([]), { provide: LoreService, useValue: loreServiceMock }],
    }).compileComponents();
    const fixture = TestBed.createComponent(Lore);
    expect((fixture.componentInstance as any).loading()).toBe(true);
  });

  it('exibe artigos após carregar', async () => {
    const { component } = await setup();
    expect(component.articles().length).toBe(MOCK_LORE.length);
    expect(component.loading()).toBe(false);
  });

  it('exibe totalElements correto', async () => {
    const { component } = await setup();
    expect(component.totalElements()).toBe(MOCK_LORE.length);
  });

  it('não exibe paginação com 1 página', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('.lr__pagination')).toBeNull();
  });

  it('exibe paginação com múltiplas páginas', async () => {
    const { fixture } = await setup(makePage(MOCK_LORE, 36, 3));
    expect(fixture.nativeElement.querySelector('.lr__pagination')).not.toBeNull();
  });

  it('setCategoryFilter chama service com category correta e reseta página', async () => {
    const { component } = await setup();
    loreServiceMock.list.mockClear();
    loreServiceMock.list.mockReturnValue(of(makePage([])));
    component.setCategoryFilter('CHARACTER');
    vi.advanceTimersByTime(250);
    expect(loreServiceMock.list).toHaveBeenCalledWith(0, 12, undefined, undefined, 'CHARACTER');
    expect(component.currentPage()).toBe(0);
  });

  it('onSearchInput chama service com q correto', async () => {
    const { component } = await setup();
    loreServiceMock.list.mockClear();
    loreServiceMock.list.mockReturnValue(of(makePage([])));
    component.onSearchInput('ranni');
    vi.advanceTimersByTime(250);
    expect(loreServiceMock.list).toHaveBeenCalledWith(0, 12, 'ranni', undefined, undefined);
  });

  it('goToPage atualiza currentPage e chama service', async () => {
    const { component } = await setup(makePage(MOCK_LORE, 36, 3));
    loreServiceMock.list.mockClear();
    loreServiceMock.list.mockReturnValue(of(makePage(MOCK_LORE, 36, 3)));
    component.goToPage(2);
    vi.advanceTimersByTime(250);
    expect(component.currentPage()).toBe(2);
    expect(loreServiceMock.list).toHaveBeenCalledWith(2, 12, undefined, undefined, undefined);
  });

  it('goToPage ignora página fora do intervalo', async () => {
    const { component } = await setup(makePage(MOCK_LORE, 12, 1));
    loreServiceMock.list.mockClear();
    component.goToPage(-1);
    component.goToPage(99);
    vi.advanceTimersByTime(250);
    expect(loreServiceMock.list).not.toHaveBeenCalled();
  });

  describe('categoryLabel()', () => {
    it('mapeia WORLD e CHARACTER', async () => {
      const { component } = await setup();
      expect(component.categoryLabel('WORLD')).toBe('mundo');
      expect(component.categoryLabel('CHARACTER')).toBe('personagem');
    });
  });

  describe('statusLabel()', () => {
    it('mapeia todos os status', async () => {
      const { component } = await setup();
      expect(component.statusLabel('CANONICO')).toBe('canônico');
      expect(component.statusLabel('CONSOLIDADO')).toBe('consolidado');
      expect(component.statusLabel('TEORIA')).toBe('teoria');
    });
  });

  describe('pageNumbers()', () => {
    it('retorna sequência completa para totalPages <= 7', async () => {
      const { component } = await setup(makePage(MOCK_LORE, 36, 3));
      expect(component.pageNumbers()).toEqual([0, 1, 2]);
    });

    it('insere ellipsis para muitas páginas', async () => {
      const { component } = await setup(makePage(MOCK_LORE, 120, 10));
      const pages = component.pageNumbers();
      expect(pages).toContain(-1);
      expect(pages[0]).toBe(0);
      expect(pages[pages.length - 1]).toBe(9);
    });
  });
});
