import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { Home } from './home';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let component: Home;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir todas as quests sem filtro', () => {
    const quests = (component as unknown as { filteredQuests: () => unknown[] }).filteredQuests();
    expect(quests.length).toBeGreaterThan(0);
  });

  it('deve filtrar quests por jogo selecionado', () => {
    const comp = component as unknown as {
      filteredQuests: () => { gameId: string }[];
      toggleGame: (id: string) => void;
    };
    comp.toggleGame('elden-ring');
    const quests = comp.filteredQuests();
    expect(quests.every((q) => q.gameId === 'elden-ring')).toBe(true);
  });

  it('deve desmarcar jogo ao clicar duas vezes', () => {
    const comp = component as unknown as {
      filteredQuests: () => unknown[];
      selectedGameId: () => string | null;
      toggleGame: (id: string) => void;
    };
    comp.toggleGame('elden-ring');
    comp.toggleGame('elden-ring');
    expect(comp.selectedGameId()).toBeNull();
  });

  it('deve filtrar quests por termo de busca', () => {
    const comp = component as unknown as {
      filteredQuests: () => { title: string }[];
      onSearch: (term: string) => void;
    };
    comp.onSearch('Ranni');
    const quests = comp.filteredQuests();
    expect(quests.every((q) => q.title.toLowerCase().includes('ranni'))).toBe(true);
  });

  it('deve retornar lista vazia quando busca não tem resultado', () => {
    const comp = component as unknown as {
      filteredQuests: () => unknown[];
      onSearch: (term: string) => void;
    };
    comp.onSearch('xpto123inexistente');
    expect(comp.filteredQuests()).toHaveLength(0);
  });

  it('deve exibir máximo 5 quests', () => {
    const comp = component as unknown as { filteredQuests: () => unknown[] };
    expect(comp.filteredQuests().length).toBeLessThanOrEqual(5);
  });

  it('deve exibir máximo 4 artigos de lore', () => {
    const comp = component as unknown as { filteredLore: () => unknown[] };
    expect(comp.filteredLore().length).toBeLessThanOrEqual(4);
  });

  it('loreBadgeLabel retorna o rótulo correto', () => {
    const comp = component as unknown as {
      loreBadgeLabel: (status: string) => string;
    };
    expect(comp.loreBadgeLabel('CANONICO')).toBe('Canônico');
    expect(comp.loreBadgeLabel('CONSOLIDADO')).toBe('Consolidado');
    expect(comp.loreBadgeLabel('TEORIA')).toBe('Teoria');
  });
});
