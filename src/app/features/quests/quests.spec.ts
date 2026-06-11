import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { Quests } from './quests';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';

interface QuestsComp {
  search: { set(v: string): void };
  gameFilter: { set(v: string): void };
  statusFilter: { set(v: string): void };
  filtered: () => typeof QUESTS_DETAIL;
  loading: () => boolean;
  statusLabel: (s: string) => string;
  followersLabel: (n: number) => string;
}

describe('Quests', () => {
  let fixture: ComponentFixture<Quests>;
  let comp: QuestsComp;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Quests],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Quests);
    comp = fixture.componentInstance as unknown as QuestsComp;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('inicia em estado de loading', () => {
    expect(comp.loading()).toBe(true);
  });

  it('exibe todos os quests sem filtro', () => {
    expect(comp.filtered().length).toBe(QUESTS_DETAIL.length);
  });

  it('filtra por jogo', () => {
    comp.gameFilter.set('elden-ring');
    const result = comp.filtered();
    expect(result.every((q) => q.gameId === 'elden-ring')).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('filtra por status', () => {
    comp.statusFilter.set('CANONICO');
    const result = comp.filtered();
    expect(result.every((q) => q.status === 'CANONICO')).toBe(true);
  });

  it('filtra por termo de busca', () => {
    comp.search.set('Ranni');
    const result = comp.filtered();
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (q) =>
          q.title.toLowerCase().includes('ranni') || q.description.toLowerCase().includes('ranni'),
      ),
    ).toBe(true);
  });

  it('retorna vazio para busca sem resultado', () => {
    comp.search.set('xxxxinexistente9999');
    expect(comp.filtered()).toHaveLength(0);
  });

  it('filtros combinados funcionam', () => {
    comp.gameFilter.set('elden-ring');
    comp.statusFilter.set('CANONICO');
    const result = comp.filtered();
    expect(result.every((q) => q.gameId === 'elden-ring' && q.status === 'CANONICO')).toBe(true);
  });

  it('statusLabel mapeia corretamente', () => {
    expect(comp.statusLabel('CANONICO')).toBe('canônico');
    expect(comp.statusLabel('CONSOLIDADO')).toBe('consolidado');
    expect(comp.statusLabel('TEORIA')).toBe('teoria');
  });

  it('followersLabel formata milhares corretamente', () => {
    expect(comp.followersLabel(999)).toBe('999');
    expect(comp.followersLabel(1000)).toBe('1.0k');
    expect(comp.followersLabel(4800)).toBe('4.8k');
    expect(comp.followersLabel(0)).toBe('0');
  });
});
