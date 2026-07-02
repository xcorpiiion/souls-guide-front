import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { QuestEditor } from './quest-editor';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';
import { QuestService } from '../../core/services/quest.service';
import { QuestApi } from '../../shared/models/quest.model';

const MOCK_QUEST = QUESTS_DETAIL.find((q) => q.id === 'er-q1')!;
const MOCK_QUEST_API: QuestApi = {
  id: 1,
  title: MOCK_QUEST.title,
  description: MOCK_QUEST.description ?? '',
  status: MOCK_QUEST.status,
  userId: 'user-1',
  gameId: 1,
  gameName: MOCK_QUEST.gameName,
  nodes: MOCK_QUEST.nodes,
  edges: MOCK_QUEST.edges,
  relatedQuests: MOCK_QUEST.relatedQuests,
  isPersonal: false,
  ownerId: null,
  isOwner: true,
  isPublic: true,
  allowCopy: false,
  likeCount: 0,
  userHasLiked: false,
  followerCount: 0,
  userIsFollowing: false,
};

function createFixture(gameId: string, questId?: string) {
  const questServiceMock = {
    get: vi.fn(() => of(MOCK_QUEST_API)),
    create: vi.fn(),
    update: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [QuestEditor],
    providers: [
      provideRouter([{ path: 'games/:gameId/quests/:questId', component: QuestEditor }]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(questId ? { gameId, questId } : { gameId }),
            queryParamMap: convertToParamMap({}),
            url: [],
          },
        },
      },
      { provide: QuestService, useValue: questServiceMock },
    ],
  });
  const f = TestBed.createComponent(QuestEditor);
  f.detectChanges();
  return { fixture: f, questServiceMock };
}

describe('QuestEditor', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const { fixture } = createFixture('elden-ring');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve renderizar a toolbar', () => {
    const { fixture } = createFixture('elden-ring');
    expect(fixture.nativeElement.querySelector('.qe__toolbar')).toBeTruthy();
  });

  it('deve iniciar com nó start em modo criação', () => {
    const { fixture } = createFixture('elden-ring');
    expect(fixture.componentInstance['nodes']().length).toBe(1);
    expect(fixture.componentInstance['nodes']()[0].type).toBe('start');
  });

  it('deve carregar quest existente em modo edição', () => {
    const { fixture } = createFixture('elden-ring', 'er-q1');
    expect(fixture.componentInstance['nodes']().length).toBe(MOCK_QUEST.nodes.length);
    expect(fixture.componentInstance['title']()).toBe(MOCK_QUEST.title);
  });

  it('deve exibir badge "edição" em modo edição', () => {
    const { fixture } = createFixture('elden-ring', 'er-q1');
    const badge = fixture.nativeElement.querySelector('.qe__status-badge');
    expect(badge?.textContent?.trim()).toBe('edição');
  });

  it('deve exibir badge "criação" em modo criação', () => {
    const { fixture } = createFixture('elden-ring');
    const badge = fixture.nativeElement.querySelector('.qe__status-badge');
    expect(badge?.textContent?.trim()).toBe('criação');
  });

  it('deve renderizar o editor em lista', () => {
    const { fixture } = createFixture('elden-ring');
    expect(fixture.nativeElement.querySelector('app-quest-editor-list')).toBeTruthy();
  });

  it('onGraphChange atualiza nodes/edges e marca como sujo', () => {
    const { fixture } = createFixture('elden-ring');
    const comp = fixture.componentInstance as any;
    const newNodes = [...comp.nodes(), { id: 'n2', type: 'task', label: 'nova etapa' }];
    const newEdges = [{ id: 'e1', from: comp.nodes()[0].id, to: 'n2' }];
    comp.onGraphChange({ nodes: newNodes, edges: newEdges });
    expect(comp.nodes().length).toBe(2);
    expect(comp.edges().length).toBe(1);
    expect(comp.hasUnsavedChanges()).toBe(true);
  });

  it('saveQuest cria uma nova quest em modo criação', () => {
    const { fixture, questServiceMock } = createFixture('elden-ring');
    const comp = fixture.componentInstance as any;
    questServiceMock.create.mockReturnValue(of({ id: 99 }));
    comp.title.set('Minha quest');
    comp.saveQuest();
    expect(questServiceMock.create).toHaveBeenCalled();
  });

  it('saveQuest atualiza a quest em modo edição', () => {
    const { fixture, questServiceMock } = createFixture('elden-ring', 'er-q1');
    const comp = fixture.componentInstance as any;
    questServiceMock.update.mockReturnValue(of(MOCK_QUEST_API));
    comp.saveQuest();
    expect(questServiceMock.update).toHaveBeenCalledWith('er-q1', expect.any(Object));
  });

  it('saving fica true durante o save e false após completar', () => {
    const { fixture, questServiceMock } = createFixture('elden-ring', 'er-q1');
    const comp = fixture.componentInstance as any;
    questServiceMock.update.mockReturnValue(of(MOCK_QUEST_API));
    expect(comp.saving()).toBe(false);
    comp.saveQuest();
    // after sync resolution via of(), saving should be false again
    expect(comp.saving()).toBe(false);
  });

  it('saveQuest não envia segunda requisição enquanto já está salvando', () => {
    const { fixture, questServiceMock } = createFixture('elden-ring', 'er-q1');
    const comp = fixture.componentInstance as any;
    const subject = new Subject();
    questServiceMock.update.mockReturnValue(subject.asObservable());
    comp.saveQuest(); // first call — stays pending
    expect(comp.saving()).toBe(true);
    comp.saveQuest(); // second call — should be ignored
    comp.saveQuest(); // third call — should be ignored
    expect(questServiceMock.update).toHaveBeenCalledTimes(1);
  });
});
