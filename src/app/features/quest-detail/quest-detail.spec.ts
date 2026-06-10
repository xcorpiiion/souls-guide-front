import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { QuestDetail } from './quest-detail';
import { QUESTS_DETAIL } from './quest-detail.mocks';

function createFixture(gameId: string, questId: string): ComponentFixture<QuestDetail> {
  TestBed.configureTestingModule({
    imports: [QuestDetail],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ gameId, questId }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(QuestDetail);
  fixture.detectChanges();
  return fixture;
}

describe('QuestDetail', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir o título da quest', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    const title = fixture.nativeElement.querySelector('.quest-detail__title')?.textContent?.trim();
    const quest = QUESTS_DETAIL.find((q) => q.id === 'er-q1')!;
    expect(title).toBe(quest.title);
  });

  it('deve exibir as 4 stats', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    const stats = fixture.nativeElement.querySelectorAll('.quest-detail__stat');
    expect(stats.length).toBe(4);
  });

  it('deve exibir a hint de clique quando nenhum nó está selecionado', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    expect(fixture.nativeElement.querySelector('.quest-detail__panel-hint')).toBeTruthy();
  });

  it('deve exibir o detalhe do nó ao selecionar', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    fixture.componentInstance['onNodeSelect']('n1');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.quest-detail__node-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.quest-detail__panel-hint')).toBeFalsy();
  });

  it('deve deselecionar nó ao clicar novamente', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    fixture.componentInstance['onNodeSelect']('n1');
    fixture.componentInstance['onNodeSelect']('n1');
    fixture.detectChanges();
    expect(fixture.componentInstance['selectedNodeId']()).toBeNull();
  });

  it('deve exibir badge de quest externa ao selecionar nó externo', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    fixture.componentInstance['onNodeSelect']('n4');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.quest-detail__node-type-badge')).toBeTruthy();
  });

  it('deve exibir quests relacionadas', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    const cards = fixture.nativeElement.querySelectorAll('.quest-detail__related-card');
    const quest = QUESTS_DETAIL.find((q) => q.id === 'er-q1')!;
    expect(cards.length).toBe(quest.relatedQuests.length);
  });

  it('deve renderizar o componente de grafo', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    expect(fixture.nativeElement.querySelector('app-quest-graph')).toBeTruthy();
  });

  it('deve exibir not-found para quest inexistente', () => {
    const fixture = createFixture('elden-ring', 'inexistente');
    expect(fixture.nativeElement.querySelector('.quest-detail__not-found')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.quest-detail')).toBeFalsy();
  });

  it('deve exibir o badge de status da quest', () => {
    const fixture = createFixture('elden-ring', 'er-q1');
    const badge = fixture.nativeElement.querySelector('.quest-detail__status');
    expect(badge?.textContent?.trim()).toBe('canonico');
  });
});
