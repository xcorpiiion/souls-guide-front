import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { QuestConditions } from './quest-conditions';
import { QuestService } from '../../core/services/quest.service';
import { QuestConditionService } from '../../core/services/quest-condition.service';
import { QuestApi, QuestSummary } from '../../shared/models/quest.model';
import { Page } from '../../shared/models/page.model';

const MOCK_QUEST_SUMMARY: QuestSummary = {
  id: '45',
  title: 'Questline de Ranni, a Bruxa',
  gameId: '1',
  gameName: 'Elden Ring',
  stepCount: 3,
  forkCount: 0,
  endingCount: 1,
  status: 'CANONICO',
  followers: 0,
  author: null,
};

const MOCK_QUEST_API: QuestApi = {
  id: 45,
  title: 'Questline de Ranni, a Bruxa',
  description: '',
  status: 'CANONICO',
  userId: 'u1',
  gameId: 1,
  gameName: 'Elden Ring',
  nodes: [
    { id: 'n1', type: 'start', label: 'início' },
    { id: 'n2', type: 'task', label: 'Encontrar Ranni' },
    { id: 'n3', type: 'end', label: 'final' },
  ],
  edges: [],
  relatedQuests: [],
  isPersonal: false,
  ownerId: null,
  isOwner: false,
  isPublic: true,
  allowCopy: false,
  likeCount: 0,
  userHasLiked: false,
  followerCount: 0,
  userIsFollowing: false,
};

const MOCK_PAGE: Page<QuestSummary> = {
  content: [MOCK_QUEST_SUMMARY],
  totalElements: 1,
  totalPages: 1,
  pageNumber: 0,
  pageSize: 100,
  last: true,
  first: true,
};

function createFixture(): ComponentFixture<QuestConditions> {
  const questServiceMock = {
    list: vi.fn(() => of(MOCK_PAGE)),
    get: vi.fn(() => of(MOCK_QUEST_API)),
  };
  const conditionServiceMock = {
    listByGame: vi.fn(() => of([])),
  };
  TestBed.configureTestingModule({
    imports: [QuestConditions],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
      },
      { provide: QuestService, useValue: questServiceMock },
      { provide: QuestConditionService, useValue: conditionServiceMock },
    ],
  });
  const fixture = TestBed.createComponent(QuestConditions);
  fixture.detectChanges();
  return fixture;
}

describe('QuestConditions', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve carregar as opções de nó a partir das quests do jogo', () => {
    const fixture = createFixture();
    const options = fixture.componentInstance['nodeOptions']();
    expect(options.length).toBe(2);
    expect(options.some((o) => o.nodeId === 'n2')).toBe(true);
    expect(options.some((o) => o.nodeId === 'n1')).toBe(false);
  });

  it('formValid é falso sem gatilhos selecionados', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance['formValid']()).toBe(false);
  });

  it('formValid fica true com gatilho, quest afetada e descrição preenchidos', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.toggleTrigger('n2');
    comp.affectedQuestId.set('45');
    comp.description.set('Ranni some pra sempre.');
    expect(comp.formValid()).toBe(true);
  });
});
