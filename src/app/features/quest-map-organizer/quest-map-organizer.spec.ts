import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { QuestMapOrganizer } from './quest-map-organizer';
import { QuestService } from '../../core/services/quest.service';
import { QuestApi } from '../../shared/models/quest.model';
import { QuestMapService } from '../../core/services/quest-map.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { GameQuestMapResponse } from '../../shared/models/quest-map.model';

const MOCK_QUESTS = [
  {
    id: '1',
    title: 'A Última Promessa',
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
    title: 'Rastros da Cidade Velha',
    gameId: 'g1',
    stepCount: 5,
    forkCount: 1,
    endingCount: 2,
    status: 'CONSOLIDADO',
    followers: 0,
    author: null,
  },
];

const MOCK_QUEST_DETAIL: Partial<QuestApi> = {
  id: 1,
  title: 'A Última Promessa',
  nodes: [
    { id: 'n1', type: 'start', label: 'Início' },
    { id: 'n2', type: 'task', label: 'Falar com Stone' },
    { id: 'n3', type: 'gateway', label: 'Bifurcação: ajudar ou trair?' },
    { id: 'n4', type: 'task', label: 'Entregar o artefato' },
    { id: 'n5', type: 'end', label: 'Fim' },
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 'n2' },
    { id: 'e2', from: 'n2', to: 'n3' },
    { id: 'e3', from: 'n3', to: 'n4' },
  ],
  relatedQuests: [],
} as unknown as Partial<QuestApi>;

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
          get: () => of(MOCK_QUEST_DETAIL),
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

/** Helper: percorre o picker de 3 etapas (questline → quest node → phase) */
function fillPicker(
  component: QuestMapOrganizer,
  sectionId: number | string,
  questlineId: string,
  questlineTitle: string,
  nodeId: string,
  nodeLabel: string,
  phase: 'inicio' | 'meio' | 'fim' | 'full',
) {
  component['openPicker'](sectionId);
  component['selectQuestline'](questlineId, questlineTitle);
  component['selectQuestNode'](nodeId, nodeLabel);
  component['selectPhase'](phase);
  component['confirmPick']();
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

  it('should remove a section after confirmation', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['confirmRemoveSection'](id, 'Limgrave', new MouseEvent('click'));
    expect(component['pendingRemove']()?.type).toBe('section');
    component['onRemoveConfirmed']();
    expect(component['sections']().length).toBe(0);
    expect(component['pendingRemove']()).toBeNull();
  });

  it('should cancel section removal', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['confirmRemoveSection'](id, 'Limgrave', new MouseEvent('click'));
    component['onRemoveCancelled']();
    expect(component['sections']().length).toBe(1);
    expect(component['pendingRemove']()).toBeNull();
  });

  it('should open picker at questline step', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['openPicker'](id);
    expect(component['picker']()?.sectionId).toBe(id);
    expect(component['picker']()?.step).toBe('questline');
  });

  it('should advance to quest step and load nodes after selecting questline', () => {
    component['addSection']();
    component['openPicker'](component['sections']()[0].id);
    component['selectQuestline']('1', 'A Última Promessa');
    expect(component['picker']()?.step).toBe('quest');
    expect(component['picker']()?.questlineId).toBe('1');
    expect(component['picker']()?.questlineTitle).toBe('A Última Promessa');
    const groups = component['pickerGroups']();
    expect(groups.length).toBeGreaterThan(0);
    const topLevel = groups.find((g) => g.gatewayLabel === null);
    expect(topLevel?.topNodes[0].label).toBe('Falar com Stone');
    const gatewayGroup = groups.find((g) => g.gatewayLabel === 'Bifurcação: ajudar ou trair?');
    expect(gatewayGroup).toBeDefined();
    expect(gatewayGroup?.branches[0].headerNode.label).toBe('Entregar o artefato');
  });

  it('should advance to phase step after selecting quest node', () => {
    component['addSection']();
    component['openPicker'](component['sections']()[0].id);
    component['selectQuestline']('1', 'A Última Promessa');
    component['selectQuestNode']('n2', 'Falar com Stone');
    expect(component['picker']()?.step).toBe('phase');
    expect(component['picker']()?.questNodeLabel).toBe('Falar com Stone');
    expect(component['picker']()?.questNodeId).toBe('n2');
  });

  it('should show all available questlines', () => {
    component['addSection']();
    component['openPicker'](component['sections']()[0].id);
    expect(component['availableForPicker']().length).toBe(2);
  });

  it('should go back to questline step from quest step', () => {
    component['addSection']();
    component['openPicker'](component['sections']()[0].id);
    component['selectQuestline']('1', 'A Última Promessa');
    component['backToQuestlineStep']();
    expect(component['picker']()?.step).toBe('questline');
    expect(component['picker']()?.questlineId).toBeNull();
  });

  it('should go back to quest step from phase step', () => {
    component['addSection']();
    component['openPicker'](component['sections']()[0].id);
    component['selectQuestline']('1', 'A Última Promessa');
    component['selectQuestNode']('n2', 'Falar com Stone');
    component['backToQuestStep']();
    expect(component['picker']()?.step).toBe('quest');
    expect(component['picker']()?.questNodeId).toBeNull();
  });

  it('should add entry after completing all 3 steps', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    fillPicker(component, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'inicio');
    expect(component['sections']()[0].entries.length).toBe(1);
    const entry = component['sections']()[0].entries[0];
    expect(entry.questId).toBe('1');
    expect(entry.questTitle).toBe('A Última Promessa');
    expect(entry.nodeId).toBe('n2');
    expect(entry.nodeTitle).toBe('Falar com Stone');
    expect(entry.phase).toBe('inicio');
    expect(component['picker']()).toBeNull();
  });

  it('should not confirm pick without phase selected', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['openPicker'](id);
    component['selectQuestline']('1', 'A Última Promessa');
    component['selectQuestNode']('n2', 'Falar com Stone');
    component['confirmPick']();
    expect(component['sections']()[0].entries.length).toBe(0);
    expect(component['picker']()).not.toBeNull();
  });

  it('should count placed quests', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    fillPicker(component, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'full');
    expect(component['placedCount']()).toBe(1);
  });

  it('should track used entry keys as questId|nodeId', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    fillPicker(component, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'full');
    const keys = component['usedEntryKeys']();
    expect(keys.has('1|n2')).toBe(true);
  });

  it('should still show questline in picker after one node is placed', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    fillPicker(component, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'full');
    const available = component['availableForPicker']();
    expect(available.find((q) => q.id === '1')).toBeDefined();
    expect(available.length).toBe(2);
  });

  it('should remove entry from section after confirmation', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    fillPicker(component, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'inicio');
    component['confirmRemoveEntry'](id, '1', 'n2', 'A Última Promessa — Falar com Stone');
    expect(component['pendingRemove']()?.type).toBe('entry');
    component['onRemoveConfirmed']();
    expect(component['sections']()[0].entries.length).toBe(0);
    expect(component['pendingRemove']()).toBeNull();
  });

  it('should update section name', () => {
    component['addSection']();
    const id = component['sections']()[0].id;
    component['updateSectionName'](id, 'Limgrave');
    expect(component['sections']()[0].name).toBe('Limgrave');
  });

  it('should replace local ids with numeric ids after save', () => {
    mockSaveResult = {
      gameId: 1,
      sections: [{ id: 99, name: 'Limgrave', order: 0, entries: [] }],
    };
    component['addSection']();
    const localId = component['sections']()[0].id;
    component['updateSectionName'](localId, 'Limgrave');
    component['save']();
    expect(component['sections']()[0].id).toBe(99);
    expect(TOAST_MOCK.success).toHaveBeenCalled();
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
          entries: [
            {
              questId: 1,
              questTitle: 'A Última Promessa',
              nodeId: 2,
              nodeTitle: 'Falar com Stone',
              phase: 'inicio',
              order: 0,
            },
          ],
        },
      ],
    };
    const fixture = setup(mapWithData);
    const component = fixture.componentInstance;
    expect(component['sections']().length).toBe(1);
    expect(component['sections']()[0].id).toBe(10);
    const entry = component['sections']()[0].entries[0];
    expect(entry.questId).toBe('1');
    expect(entry.questTitle).toBe('A Última Promessa');
    expect(entry.nodeId).toBe('2');
    expect(entry.nodeTitle).toBe('Falar com Stone');
  });
});
