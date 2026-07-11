import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { QuestMapOrganizer } from './quest-map-organizer';
import { QuestService } from '../../core/services/quest.service';
import { QuestNode } from '../../shared/models/quest.model';
import { QuestMapService } from '../../core/services/quest-map.service';
import { QuestProgressService } from '../../core/services/quest-progress.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { GameQuestMapResponse } from '../../shared/models/quest-map.model';
import { UserProgress } from '../../shared/models/user-progress.model';

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

const MOCK_NODES: QuestNode[] = [
  { id: 'n1', type: 'start', label: 'Início' },
  { id: 'n2', type: 'task', label: 'Falar com Stone' },
  { id: 'n3', type: 'gateway', label: 'Bifurcação: ajudar ou trair?' },
  { id: 'n4', type: 'task', label: 'Entregar o artefato' },
  { id: 'n5', type: 'end', label: 'Fim' },
];

const EMPTY_MAP: GameQuestMapResponse = { gameId: 1, sections: [] };

const TOAST_MOCK = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };

let mockSaveResult: GameQuestMapResponse = EMPTY_MAP;
let mockProgressResult: UserProgress | null = null;

function setup(mapResponse: GameQuestMapResponse = EMPTY_MAP): ComponentFixture<QuestMapOrganizer> {
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
          listNodes: () => of(MOCK_NODES),
        },
      },
      {
        provide: QuestMapService,
        useValue: { getMap: () => of(mapResponse), saveMap: () => of(mockSaveResult) },
      },
      {
        provide: QuestProgressService,
        useValue: { getProgress: () => (mockProgressResult ? of(mockProgressResult) : of(null)) },
      },
      { provide: ToastService, useValue: TOAST_MOCK },
    ],
  });
  const fixture = TestBed.createComponent(QuestMapOrganizer);
  fixture.detectChanges();
  return fixture;
}

function fillPicker(
  component: QuestMapOrganizer,
  sectionId: number | string,
  questlineId: string,
  questlineTitle: string,
  nodeId: string | null,
  nodeLabel: string | null,
  phase: 'inicio' | 'meio' | 'fim' | 'full',
): void {
  component['openPicker'](sectionId);
  component['selectQuestline'](questlineId, questlineTitle);
  if (nodeId && nodeLabel) {
    component['picker'].update((p) =>
      p ? { ...p, questNodeId: nodeId, questNodeLabel: nodeLabel } : p,
    );
  }
  component['selectPhase'](phase);
  component['confirmPick']();
}

describe('QuestMapOrganizer', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    mockSaveResult = EMPTY_MAP;
    mockProgressResult = null;
  });

  it('should create', () => {
    const { componentInstance: comp } = setup();
    expect(comp).toBeTruthy();
  });

  it('should load quests on init', () => {
    const { componentInstance: comp } = setup();
    expect(comp['quests']().length).toBe(2);
  });

  it('should start with no sections when map is empty', () => {
    const { componentInstance: comp } = setup();
    expect(comp['sections']().length).toBe(0);
  });

  it('should add a section with temporary local id', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    expect(comp['sections']().length).toBe(1);
    expect(String(comp['sections']()[0].id).startsWith('local-')).toBe(true);
  });

  it('should remove a section after confirmation', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    comp['confirmRemoveSection'](id, 'Limgrave', new MouseEvent('click'));
    expect(comp['pendingRemove']()?.type).toBe('section');
    comp['onRemoveConfirmed']();
    expect(comp['sections']().length).toBe(0);
    expect(comp['pendingRemove']()).toBeNull();
  });

  it('should cancel section removal', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    comp['confirmRemoveSection'](id, 'Limgrave', new MouseEvent('click'));
    comp['onRemoveCancelled']();
    expect(comp['sections']().length).toBe(1);
    expect(comp['pendingRemove']()).toBeNull();
  });

  it('should open picker at questline step', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    comp['openPicker'](id);
    expect(comp['picker']()?.sectionId).toBe(id);
    expect(comp['picker']()?.step).toBe('questline');
  });

  it('should advance to details step and load nodes after selecting questline', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    comp['openPicker'](comp['sections']()[0].id);
    comp['selectQuestline']('1', 'A Última Promessa');
    expect(comp['picker']()?.step).toBe('details');
    expect(comp['picker']()?.questlineId).toBe('1');
    expect(comp['picker']()?.questlineTitle).toBe('A Última Promessa');
    const nodes = comp['pickerNodes']();
    expect(nodes.length).toBe(4);
    expect(nodes.some((n) => n.label === 'Falar com Stone')).toBe(true);
    expect(nodes.some((n) => n.type === 'start')).toBe(false);
  });

  it('should show all available questlines', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    comp['openPicker'](comp['sections']()[0].id);
    expect(comp['availableForPicker']().length).toBe(2);
  });

  it('should go back to questline step from details step', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    comp['openPicker'](comp['sections']()[0].id);
    comp['selectQuestline']('1', 'A Última Promessa');
    comp['backToQuestlineStep']();
    expect(comp['picker']()?.step).toBe('questline');
    expect(comp['picker']()?.questlineId).toBeNull();
  });

  it('should add entry with node after completing 2 steps', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    fillPicker(comp, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'inicio');
    expect(comp['sections']()[0].entries.length).toBe(1);
    const entry = comp['sections']()[0].entries[0];
    expect(entry.questId).toBe('1');
    expect(entry.questTitle).toBe('A Última Promessa');
    expect(entry.nodeId).toBe('n2');
    expect(entry.nodeTitle).toBe('Falar com Stone');
    expect(entry.phase).toBe('inicio');
    expect(comp['picker']()).toBeNull();
  });

  it('should add entry without node (nodeId null)', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    fillPicker(comp, id, '1', 'A Última Promessa', null, null, 'full');
    expect(comp['sections']()[0].entries.length).toBe(1);
    const entry = comp['sections']()[0].entries[0];
    expect(entry.nodeId).toBeNull();
    expect(entry.nodeTitle).toBeNull();
    expect(entry.phase).toBe('full');
  });

  it('should not confirm pick without phase selected', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    comp['openPicker'](id);
    comp['selectQuestline']('1', 'A Última Promessa');
    comp['confirmPick']();
    expect(comp['sections']()[0].entries.length).toBe(0);
    expect(comp['picker']()).not.toBeNull();
  });

  it('should count placed quests', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    fillPicker(comp, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'full');
    expect(comp['placedCount']()).toBe(1);
  });

  it('should track used entry keys as questId|nodeId', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    fillPicker(comp, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'full');
    expect(comp['usedEntryKeys']().has('1|n2')).toBe(true);
  });

  it('should still show questline in picker after one node is placed', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    fillPicker(comp, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'full');
    const available = comp['availableForPicker']();
    expect(available.find((q) => q.id === '1')).toBeDefined();
    expect(available.length).toBe(2);
  });

  it('should remove entry from section after confirmation', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    fillPicker(comp, id, '1', 'A Última Promessa', 'n2', 'Falar com Stone', 'inicio');
    comp['confirmRemoveEntry'](id, '1', 'n2', 'A Última Promessa — Falar com Stone');
    expect(comp['pendingRemove']()?.type).toBe('entry');
    comp['onRemoveConfirmed']();
    expect(comp['sections']()[0].entries.length).toBe(0);
    expect(comp['pendingRemove']()).toBeNull();
  });

  it('should update section name', () => {
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const id = comp['sections']()[0].id;
    comp['updateSectionName'](id, 'Limgrave');
    expect(comp['sections']()[0].name).toBe('Limgrave');
  });

  it('isQuestCompleted retorna false quando não há progresso', () => {
    const { componentInstance: comp } = setup();
    expect(comp['isQuestCompleted']('1')).toBe(false);
  });

  it('isQuestCompleted retorna false quando quest está em andamento', () => {
    mockProgressResult = {
      questId: '1',
      completedNodeIds: ['n2'],
      totalNodes: 4,
      completedNodes: 1,
    };
    const { componentInstance: comp } = setup();
    expect(comp['isQuestCompleted']('1')).toBe(false);
  });

  it('questProgress retorna null para questId null', () => {
    const { componentInstance: comp } = setup();
    expect(comp['questProgress'](null)).toBeNull();
  });

  it('should replace local ids with numeric ids after save', () => {
    mockSaveResult = { gameId: 1, sections: [{ id: 99, name: 'Limgrave', order: 0, entries: [] }] };
    const { componentInstance: comp } = setup();
    comp['addSection']();
    const localId = comp['sections']()[0].id;
    comp['updateSectionName'](localId, 'Limgrave');
    comp['save']();
    expect(comp['sections']()[0].id).toBe(99);
    expect(TOAST_MOCK.success).toHaveBeenCalled();
  });
});

describe('QuestMapOrganizer — with existing map', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    mockSaveResult = EMPTY_MAP;
    mockProgressResult = null;
  });

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
    const { componentInstance: comp } = setup(mapWithData);
    expect(comp['sections']().length).toBe(1);
    expect(comp['sections']()[0].id).toBe(10);
    const entry = comp['sections']()[0].entries[0];
    expect(entry.questId).toBe('1');
    expect(entry.questTitle).toBe('A Última Promessa');
    expect(entry.nodeId).toBe('2');
    expect(entry.nodeTitle).toBe('Falar com Stone');
  });
});

describe('QuestMapOrganizer — entradas órfãs', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    mockSaveResult = EMPTY_MAP;
  });

  const mapWithOrphan: GameQuestMapResponse = {
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
            nodeId: null,
            nodeTitle: null,
            phase: 'inicio',
            order: 0,
          },
          {
            questId: null,
            questTitle: null,
            nodeId: null,
            nodeTitle: null,
            phase: 'meio',
            order: 1,
          },
        ],
      },
    ],
  };

  it('deve mapear questId null para null local', () => {
    const { componentInstance: comp } = setup(mapWithOrphan);
    const orphan = comp['sections']()[0].entries[1];
    expect(orphan.questId).toBeNull();
    expect(orphan.questTitle).toBeNull();
  });

  it('hasOrphanedEntries retorna true quando há órfãs', () => {
    const { componentInstance: comp } = setup(mapWithOrphan);
    expect(comp['hasOrphanedEntries']()).toBe(true);
  });

  it('hasOrphanedEntries retorna false sem órfãs', () => {
    const { componentInstance: comp } = setup();
    expect(comp['hasOrphanedEntries']()).toBe(false);
  });

  it('clearOrphanedEntries remove apenas as entradas com questId null', () => {
    const { componentInstance: comp } = setup(mapWithOrphan);
    expect(comp['sections']()[0].entries.length).toBe(2);
    comp['clearOrphanedEntries']();
    expect(comp['sections']()[0].entries.length).toBe(1);
    expect(comp['sections']()[0].entries[0].questId).toBe('1');
  });
});
