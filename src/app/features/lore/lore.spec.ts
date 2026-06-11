import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { Lore } from './lore';
import { LORE_ARTICLES } from './lore.mocks';

interface LoreComp {
  search: { set(v: string): void };
  gameFilter: { set(v: string): void };
  categoryFilter: { set(v: string): void };
  filtered: () => typeof LORE_ARTICLES;
  loading: () => boolean;
  categoryLabel: (cat: string) => string;
  statusLabel: (s: string) => string;
}

describe('Lore', () => {
  let fixture: ComponentFixture<Lore>;
  let comp: LoreComp;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Lore],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Lore);
    comp = fixture.componentInstance as unknown as LoreComp;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('inicia em estado de loading', () => {
    expect(comp.loading()).toBe(true);
  });

  it('exibe todos os artigos sem filtro', () => {
    expect(comp.filtered().length).toBe(LORE_ARTICLES.length);
  });

  it('filtra por jogo', () => {
    comp.gameFilter.set('elden-ring');
    const result = comp.filtered();
    expect(result.every((a) => a.gameId === 'elden-ring')).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('filtra por categoria', () => {
    comp.categoryFilter.set('NPC');
    const result = comp.filtered();
    expect(result.every((a) => a.category === 'NPC')).toBe(true);
  });

  it('filtra por termo de busca no título', () => {
    comp.search.set('Ranni');
    const result = comp.filtered();
    expect(result.every((a) => a.title.toLowerCase().includes('ranni'))).toBe(true);
  });

  it('retorna vazio para termo sem resultado', () => {
    comp.search.set('xxxxinexistente9999');
    expect(comp.filtered()).toHaveLength(0);
  });

  it('filtros combinados funcionam', () => {
    comp.gameFilter.set('elden-ring');
    comp.categoryFilter.set('NPC');
    const result = comp.filtered();
    expect(result.every((a) => a.gameId === 'elden-ring' && a.category === 'NPC')).toBe(true);
  });

  it('categoryLabel mapeia corretamente', () => {
    expect(comp.categoryLabel('NPC')).toBe('NPC');
    expect(comp.categoryLabel('LOCACAO')).toBe('locação');
    expect(comp.categoryLabel('ITEM')).toBe('item');
    expect(comp.categoryLabel('EVENTO')).toBe('evento');
    expect(comp.categoryLabel('TEORIA')).toBe('teoria');
  });

  it('statusLabel mapeia corretamente', () => {
    expect(comp.statusLabel('CANONICO')).toBe('canônico');
    expect(comp.statusLabel('CONSOLIDADO')).toBe('consolidado');
    expect(comp.statusLabel('TEORIA')).toBe('teoria');
  });
});
