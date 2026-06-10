import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { QuestEditor } from './quest-editor';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';

function createFixture(gameId: string, questId?: string) {
  TestBed.configureTestingModule({
    imports: [QuestEditor],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(questId ? { gameId, questId } : { gameId }),
          },
        },
      },
    ],
  });
  const f = TestBed.createComponent(QuestEditor);
  f.detectChanges();
  return f;
}

describe('QuestEditor', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const f = createFixture('elden-ring');
    expect(f.componentInstance).toBeTruthy();
  });

  it('deve renderizar a toolbar', () => {
    const f = createFixture('elden-ring');
    expect(f.nativeElement.querySelector('.qe__toolbar')).toBeTruthy();
  });

  it('deve iniciar com nó start em modo criação', () => {
    const f = createFixture('elden-ring');
    expect(f.componentInstance['nodes']().length).toBe(1);
    expect(f.componentInstance['nodes']()[0].type).toBe('start');
  });

  it('deve carregar quest existente em modo edição', () => {
    const f = createFixture('elden-ring', 'er-q1');
    const quest = QUESTS_DETAIL.find((q) => q.id === 'er-q1')!;
    expect(f.componentInstance['nodes']().length).toBe(quest.nodes.length);
  });

  it('deve exibir badge "edição" em modo edição', () => {
    const f = createFixture('elden-ring', 'er-q1');
    const badge = f.nativeElement.querySelector('.qe__status-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('edição');
  });

  it('deve exibir badge "criação" em modo criação', () => {
    const f = createFixture('elden-ring');
    const badge = f.nativeElement.querySelector('.qe__status-badge');
    expect(badge?.textContent?.trim()).toBe('criação');
  });

  it('deve adicionar nó tarefa ao clicar no botão', () => {
    const f = createFixture('elden-ring');
    const before = f.componentInstance['nodes']().length;
    f.componentInstance['addNode']('task');
    expect(f.componentInstance['nodes']().length).toBe(before + 1);
    const last = f.componentInstance['nodes']().at(-1)!;
    expect(last.type).toBe('task');
  });

  it('deve adicionar aresta ao conectar dois nós', () => {
    const f = createFixture('elden-ring');
    f.componentInstance['addNode']('task');
    const nodes = f.componentInstance['nodes']();
    f.componentInstance['onConnect']({ from: nodes[0].id, to: nodes[1].id });
    expect(f.componentInstance['edges']().length).toBe(1);
  });

  it('não deve adicionar aresta duplicada', () => {
    const f = createFixture('elden-ring');
    f.componentInstance['addNode']('task');
    const nodes = f.componentInstance['nodes']();
    f.componentInstance['onConnect']({ from: nodes[0].id, to: nodes[1].id });
    f.componentInstance['onConnect']({ from: nodes[0].id, to: nodes[1].id });
    expect(f.componentInstance['edges']().length).toBe(1);
  });

  it('deve selecionar nó ao emitir nodeSelect', () => {
    const f = createFixture('elden-ring');
    const id = f.componentInstance['nodes']()[0].id;
    f.componentInstance['onNodeSelect'](id);
    expect(f.componentInstance['selectedNodeId']()).toBe(id);
  });

  it('deve deselecionar ao emitir nodeSelect null', () => {
    const f = createFixture('elden-ring');
    const id = f.componentInstance['nodes']()[0].id;
    f.componentInstance['onNodeSelect'](id);
    f.componentInstance['onNodeSelect'](null);
    expect(f.componentInstance['selectedNodeId']()).toBeNull();
  });

  it('deve excluir nó selecionado e suas arestas', () => {
    const f = createFixture('elden-ring');
    f.componentInstance['addNode']('task');
    const nodes = f.componentInstance['nodes']();
    f.componentInstance['onConnect']({ from: nodes[0].id, to: nodes[1].id });
    f.componentInstance['onNodeSelect'](nodes[1].id);
    f.componentInstance['deleteSelected']();
    expect(f.componentInstance['nodes']().length).toBe(1);
    expect(f.componentInstance['edges']().length).toBe(0);
  });

  it('deve renderizar o canvas', () => {
    const f = createFixture('elden-ring');
    expect(f.nativeElement.querySelector('app-quest-editor-canvas')).toBeTruthy();
  });

  it('deve mostrar painel de metadados quando nada selecionado', () => {
    const f = createFixture('elden-ring');
    f.detectChanges();
    // props panel shows quest metadata (title input) when nothing is selected
    const inputs = f.nativeElement.querySelectorAll('.qe__props .qe__input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('deve mostrar painel de nó quando nó selecionado', () => {
    const f = createFixture('elden-ring');
    const id = f.componentInstance['nodes']()[0].id;
    f.componentInstance['onNodeSelect'](id);
    f.detectChanges();
    // props panel header says "propriedades" when a node is selected
    const header = f.nativeElement.querySelector('.qe__props-title');
    expect(header?.textContent?.trim()).toBe('propriedades');
  });
});
