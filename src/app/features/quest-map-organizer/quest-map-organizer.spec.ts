import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { QuestMapOrganizer } from './quest-map-organizer';
import { QuestService } from '../../core/services/quest.service';
import { QuestMapService } from '../../core/services/quest-map.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { GameQuestMapResponse } from '../../shared/models/quest-map.model';

const MOCK_QUESTS = [
  {
    id: '1',
    title: 'Stone',
    gameId: 'g1',
    stepCount: 3,
    forkCount: 0,
    endingCount: 1,
    status: 'CANONICO',
    followers: 0,
    author: null,
  },
  {
    id: '2',
    title: 'Shirley',
    gameId: 'g1',
    stepCount: 5,
    forkCount: 1,
    endingCount: 2,
    status: 'CONSOLIDADO',
    followers: 0,
    author: null,
  },
];

const EMPTY_MAP: GameQuestMapResponse = { gameId: 1, sections: [] };

const TOAST_MOCK = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };

let mockSaveResult: GameQuestMapResponse = EMPTY_MAP;

function setup(mapResponse: GameQuestMapResponse = EMPTY_MAP): ComponentFixture<QuestMapOrganizer> {
  const questMapSvc = {
    getMap: () => of(mapResponse),
    saveMap: () => of(mockSaveResult),
  };

  TestBed.configureTestingModule({
    imports: [QuestMapOrganizer],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'g1' } } } },
      {
        provide: QuestService,
        useValue: {
          list: () =>
            of({ content: MOCK_QUESTS, totalElements: 2, totalPages: 1, number: 0, size: 100 }),
        },
      },
      { provide: QuestMapService, useValue: questMapSvc },
      { provide: ToastService, useValue: TOAST_MOCK },
    ],
  });

  const fixture = TestBed.createComponent(QuestMapOrganizer);
  fixture.detectChanges();
  return fixture;
}

describe('QuestMapOrganizer', () => {
  let component: QuestMapOrganizer;
  let fixture: ComponentFixture<QuestMapOrganizer>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveResult = EMPTY_MAP;
    fixture = setup();
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load quests on init', () => {
    expect(component['quests']().length).toBe(2);
  });

  it('should start with no sections when map is empty', () => {
    expect(component['sections']().length).toBe(0);
  });

  it('should add a section with temporary local id', () => {
    component['addSection']();
    expect(component['sections']().length).toBe(1);
    expect(String(component['sections']()[0].id).startsWith('local-')).toBe(true);
  });

  it('should remove a section', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['removeSection'](id);
    expect(component['sections']().length).toBe(0);
  });

  it('should open picker for a section', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['openPicker'](id);
    expect(component['picker']()?.sectionId).toBe(id);
    expect(component['picker']()?.step).toBe('quest');
  });

  it('should advance picker to phase step after selecting quest', () => {
    component['addSection']();
    component['openPicker'](component['sections']()[0].id);
    component['selectQuest']('1', 'Stone');
    expect(component['picker']()?.step).toBe('phase');
    expect(component['picker']()?.questId).toBe('1');
    expect(component['picker']()?.questTitle).toBe('Stone');
  });

  it('should go back to quest step', () => {
    component['addSection']();
    component['openPicker'](component['sections']()[0].id);
    component['selectQuest']('1', 'Stone');
    component['backToQuestStep']();
    expect(component['picker']()?.step).toBe('quest');
    expect(component['picker']()?.questId).toBeNull();
  });

  it('should add entry after confirming pick', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['openPicker'](id);
    component['selectQuest']('1', 'Stone');
    component['selectPhase']('inicio');
    component['confirmPick']();
    expect(component['sections']()[0].entries.length).toBe(1);
    expect(component['sections']()[0].entries[0].questId).toBe('1');
    expect(component['sections']()[0].entries[0].phase).toBe('inicio');
    expect(component['picker']()).toBeNull();
  });

  it('should count placed quests', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['openPicker'](id);
    component['selectQuest']('1', 'Stone');
    component['selectPhase']('full');
    component['confirmPick']();
    expect(component['placedCount']()).toBe(1);
  });

  it('should exclude placed quests from available picker list', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['openPicker'](id);
    component['selectQuest']('1', 'Stone');
    component['selectPhase']('full');
    component['confirmPick']();
    const available = component['availableForPicker']();
    expect(available.find((q) => q.id === '1')).toBeUndefined();
    expect(available.length).toBe(1);
  });

  it('should remove entry from section', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['openPicker'](id);
    component['selectQuest']('1', 'Stone');
    component['selectPhase']('inicio');
    component['confirmPick']();
    component['removeEntry'](id, '1');
    expect(component['sections']()[0].entries.length).toBe(0);
  });

  it('should update section name', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['updateSectionName'](id, 'Havenswell');
    expect(component['sections']()[0].name).toBe('Havenswell');
  });

  it('should replace local ids with numeric ids after save', () => {
    mockSaveResult = {
      gameId: 1,
      sections: [{ id: 99, name: 'Havenswell', order: 0, entries: [] }],
    };
    component['addSection']();
    const localId = component['sections']()[0].id;
    component['updateSectionName'](localId, 'Havenswell');
    component['save']();
    expect(component['sections']()[0].id).toBe(99);
    expect(TOAST_MOCK.success).toHaveBeenCalled();
  });

  it('should not confirm pick without phase selected', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['openPicker'](id);
    component['selectQuest']('1', 'Stone');
    component['confirmPick']();
    expect(component['sections']()[0].entries.length).toBe(0);
    expect(component['picker']()).not.toBeNull();
  });
});

describe('QuestMapOrganizer — with existing map', () => {
  it('should load sections from existing map response', () => {
    const mapWithData: GameQuestMapResponse = {
      gameId: 1,
      sections: [
        {
          id: 10,
          name: 'Limgrave',
          order: 0,
          entries: [{ questId: 1, questTitle: 'Stone', phase: 'inicio', order: 0 }],
        },
      ],
    };
    const fixture = setup(mapWithData);
    const component = fixture.componentInstance;
    expect(component['sections']().length).toBe(1);
    expect(component['sections']()[0].id).toBe(10);
    expect(component['sections']()[0].entries[0].questId).toBe('1');
  });
});
