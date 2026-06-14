import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { KanbanList } from './kanban-list';
import { KanbanService } from '../../../core/services/kanban.service';
import { GameService } from '../../../core/services/game.service';
import { signal, computed } from '@angular/core';
import { KanbanBoard } from '../../../shared/models/kanban.model';

const MOCK_BOARDS: KanbanBoard[] = [
  {
    id: 'b1',
    userId: 'u1',
    gameId: '1',
    gameName: 'Elden Ring',
    characterName: 'Ranni Run',
    createdAt: new Date().toISOString(),
    columns: [
      { id: 'c1', boardId: 'b1', title: 'a fazer', color: 'todo', position: 0, cards: [] },
      {
        id: 'c2',
        boardId: 'b1',
        title: 'concluído',
        color: 'done',
        position: 1,
        cards: [
          {
            id: 'cd1',
            columnId: 'c2',
            title: 'Boss',
            tags: [],
            priority: 'normal',
            notes: '',
            checklist: [],
            refs: [],
            position: 0,
            done: true,
          },
        ],
      },
    ],
  },
];

function makeKanbanSvc() {
  const _boards = signal(MOCK_BOARDS);
  return {
    boards: _boards.asReadonly(),
    boardsByGame: computed(() => [{ gameId: '1', gameName: 'Elden Ring', boards: MOCK_BOARDS }]),
    getBoard: vi.fn((id: string) => MOCK_BOARDS.find((b) => b.id === id) ?? null),
    createBoard: vi.fn(() => ({ ...MOCK_BOARDS[0], id: 'new-board' })),
    deleteBoard: vi.fn(),
  };
}

function createFixture(): ComponentFixture<KanbanList> {
  TestBed.configureTestingModule({
    imports: [KanbanList],
    providers: [
      provideRouter([]),
      { provide: KanbanService, useValue: makeKanbanSvc() },
      { provide: GameService, useValue: { search: vi.fn(() => of([])) } },
    ],
  });
  const fixture = TestBed.createComponent(KanbanList);
  fixture.detectChanges();
  return fixture;
}

describe('KanbanList', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('exibe grupos de jogos com boards', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.boardsByGame().length).toBe(1);
    expect(comp.boardsByGame()[0].gameName).toBe('Elden Ring');
  });

  it('cardCount() conta todos os cards do board', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.cardCount('b1')).toBe(1);
  });

  it('doneCount() conta apenas cards com done=true', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.doneCount('b1')).toBe(1);
  });

  it('progressPercent() calcula a porcentagem de conclusão', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.progressPercent('b1')).toBe(100);
  });

  it('progressPercent() retorna 0 quando não há cards', () => {
    const svc = makeKanbanSvc();
    svc.getBoard = vi.fn(() => ({
      ...MOCK_BOARDS[0],
      columns: [
        {
          id: 'c1',
          boardId: 'b1',
          title: 'a fazer',
          color: 'todo' as const,
          position: 0,
          cards: [],
        },
      ],
    }));
    TestBed.configureTestingModule({
      imports: [KanbanList],
      providers: [
        provideRouter([]),
        { provide: KanbanService, useValue: svc },
        { provide: GameService, useValue: { search: vi.fn(() => of([])) } },
      ],
    });
    const fixture = TestBed.createComponent(KanbanList);
    fixture.detectChanges();
    const comp = fixture.componentInstance as any;
    expect(comp.progressPercent('b1')).toBe(0);
  });

  it('openNewForm() exibe o formulário e resetaos campos', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.openNewForm();
    expect(comp.showNewForm()).toBe(true);
    expect(comp.newCharName()).toBe('');
    expect(comp.selectedGame()).toBeNull();
  });

  it('cancelNew() oculta o formulário', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.openNewForm();
    comp.cancelNew();
    expect(comp.showNewForm()).toBe(false);
  });

  it('selectGame() define o jogo selecionado e o query', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    const game = { id: '1', name: 'Elden Ring', shortName: 'ER', accentClass: '', questCount: 0 };
    comp.selectGame(game);
    expect(comp.selectedGame()).toEqual(game);
    expect(comp.gameQuery()).toBe('Elden Ring');
    expect(comp.showGameDrop()).toBe(false);
  });

  it('formatDate() retorna data no formato pt-BR', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    const iso = new Date('2024-06-14').toISOString();
    const result = comp.formatDate(iso);
    expect(result).toContain('jun');
  });
});
