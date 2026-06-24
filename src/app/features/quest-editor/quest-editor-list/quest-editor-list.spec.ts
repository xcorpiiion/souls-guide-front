import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { QuestEditorList } from './quest-editor-list';
import { QuestEdge, QuestNode } from '../../../shared/models/quest.model';
import { ConfirmService } from '../../../core/services/confirm.service';

function setGraph(
  fixture: ComponentFixture<QuestEditorList>,
  nodes: QuestNode[],
  edges: QuestEdge[],
) {
  fixture.componentRef.setInput('nodes', nodes);
  fixture.componentRef.setInput('edges', edges);
  fixture.detectChanges();
}

describe('QuestEditorList', () => {
  let fixture: ComponentFixture<QuestEditorList>;
  let comp: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [QuestEditorList],
      providers: [{ provide: ConfirmService, useValue: { ask: () => of(true) } }],
    });
    fixture = TestBed.createComponent(QuestEditorList);
    comp = fixture.componentInstance;
  });

  it('cria o componente', () => {
    setGraph(fixture, [{ id: 'start', type: 'start', label: 'início' }], []);
    expect(comp).toBeTruthy();
  });

  it('addStep adiciona uma etapa ao final da cadeia linear', () => {
    setGraph(fixture, [{ id: 'start', type: 'start', label: 'início' }], []);
    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));
    comp.addStep();
    expect(emitted!.nodes.length).toBe(2);
    expect(emitted!.edges.length).toBe(1);
    expect(emitted!.edges[0].from).toBe('start');
    expect(emitted!.edges[0].to).toBe(emitted!.nodes[1].id);
  });

  it('addStep insere antes do nó end existente', () => {
    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [{ id: 'e1', from: 'start', to: 'end' }];
    setGraph(fixture, nodes, edges);
    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));
    comp.addStep();
    expect(emitted!.nodes.length).toBe(3);
    const newNode = emitted!.nodes.find((n) => n.id !== 'start' && n.id !== 'end')!;
    expect(emitted!.edges).toContainEqual({
      id: expect.any(String),
      from: 'start',
      to: newNode.id,
    });
    expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: newNode.id, to: 'end' });
    expect(emitted!.edges.some((e) => e.from === 'start' && e.to === 'end')).toBe(false);
  });

  it('addFork cria duas ramificações reconectando ao end existente', () => {
    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [{ id: 'e1', from: 'start', to: 'end' }];
    setGraph(fixture, nodes, edges);
    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));
    comp.addFork();
    // start + end + gateway + 2 ramos = 5
    expect(emitted!.nodes.length).toBe(5);
    const gateway = emitted!.nodes.find((n) => n.type === 'gateway')!;
    expect(gateway).toBeTruthy();
    const branches = emitted!.nodes.filter((n) => n.type === 'task');
    expect(branches.length).toBe(2);
    // start → gateway
    expect(emitted!.edges).toContainEqual({
      id: expect.any(String),
      from: 'start',
      to: gateway.id,
    });
    for (const b of branches) {
      // gateway → ramo
      expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: gateway.id, to: b.id });
      // ramo → end
      expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: b.id, to: 'end' });
    }
  });

  it('deleteStep remove o nó e reconecta predecessor ao sucessor', () => {
    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'mid', type: 'task', label: 'meio' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [
      { id: 'e1', from: 'start', to: 'mid' },
      { id: 'e2', from: 'mid', to: 'end' },
    ];
    setGraph(fixture, nodes, edges);
    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));
    comp.deleteStep('mid');
    expect(emitted!.nodes.map((n) => n.id)).toEqual(['start', 'end']);
    expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: 'start', to: 'end' });
  });

  it('addBranch e deleteBranch operam sobre uma bifurcação existente', () => {
    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'b1', type: 'task', label: 'ramo 1' },
      { id: 'b2', type: 'task', label: 'ramo 2' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [
      { id: 'e1', from: 'start', to: 'b1' },
      { id: 'e2', from: 'start', to: 'b2' },
      { id: 'e3', from: 'b1', to: 'end' },
      { id: 'e4', from: 'b2', to: 'end' },
    ];
    setGraph(fixture, nodes, edges);
    const fork = comp.entries().find((e: any) => e.kind === 'fork');
    expect(fork.options.length).toBe(2);

    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));
    comp.addBranch(fork);
    expect(emitted!.nodes.length).toBe(5);
    const newBranch = emitted!.nodes.find(
      (n) => n.id !== 'start' && n.id !== 'b1' && n.id !== 'b2' && n.id !== 'end',
    )!;
    expect(emitted!.edges).toContainEqual({
      id: expect.any(String),
      from: 'start',
      to: newBranch.id,
    });
    expect(emitted!.edges).toContainEqual({
      id: expect.any(String),
      from: newBranch.id,
      to: 'end',
    });

    setGraph(fixture, nodes, edges);
    comp.deleteBranch(fork, 0);
    expect(emitted!.nodes.some((n) => n.id === 'b1')).toBe(false);
  });

  it('deleteFork remove todos os ramos e reconecta a origem ao ponto de convergência', () => {
    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'b1', type: 'task', label: 'ramo 1' },
      { id: 'b2', type: 'task', label: 'ramo 2' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [
      { id: 'e1', from: 'start', to: 'b1' },
      { id: 'e2', from: 'start', to: 'b2' },
      { id: 'e3', from: 'b1', to: 'end' },
      { id: 'e4', from: 'b2', to: 'end' },
    ];
    setGraph(fixture, nodes, edges);
    const fork = comp.entries().find((e: any) => e.kind === 'fork');
    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));
    comp.deleteFork(fork);
    expect(emitted!.nodes.map((n) => n.id)).toEqual(['start', 'end']);
    expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: 'start', to: 'end' });
  });

  it('selectStep e closeDetails controlam o painel de detalhes', () => {
    setGraph(fixture, [{ id: 'start', type: 'start', label: 'início' }], []);
    comp.selectStep('start');
    expect(comp.selectedStepId()).toBe('start');
    comp.closeDetails();
    expect(comp.selectedStepId()).toBeNull();
  });

  it('moveDown troca uma etapa de lugar com a bifurcação seguinte', () => {
    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'stepA', type: 'task', label: 'Encontrar Ranni' },
      { id: 'forkNode', type: 'task', label: 'nó de bifurcação' },
      { id: 'b1', type: 'task', label: 'ramo 1' },
      { id: 'b2', type: 'task', label: 'ramo 2' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [
      { id: 'e1', from: 'start', to: 'stepA' },
      { id: 'e2', from: 'stepA', to: 'forkNode' },
      { id: 'e3', from: 'forkNode', to: 'b1' },
      { id: 'e4', from: 'forkNode', to: 'b2' },
      { id: 'e5', from: 'b1', to: 'end' },
      { id: 'e6', from: 'b2', to: 'end' },
    ];
    setGraph(fixture, nodes, edges);
    // entries: [start(0), stepA(1), fork(2, id=forkNode, convergesTo=end), end(3)]
    expect(comp.canMoveDown(1)).toBe(true);

    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));
    comp.moveDown(1);

    setGraph(fixture, emitted!.nodes, emitted!.edges);
    const newEntries = comp.entries();
    expect(newEntries[1].kind).toBe('fork');
    expect(newEntries[2].kind).toBe('step');
    expect(newEntries[2].node.id).toBe('stepA');
    expect(newEntries[3].node.id).toBe('end');

    // os ramos da bifurcação agora convergem em stepA, que por sua vez leva ao fim
    expect(emitted!.edges).toContainEqual({
      id: expect.any(String),
      from: 'start',
      to: 'forkNode',
    });
    expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: 'b1', to: 'stepA' });
    expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: 'b2', to: 'stepA' });
    expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: 'stepA', to: 'end' });
    expect(emitted!.edges.some((e) => e.from === 'b1' && e.to === 'end')).toBe(false);
    expect(emitted!.edges.some((e) => e.from === 'b2' && e.to === 'end')).toBe(false);
  });

  it('move uma etapa do final direto para o início em uma única chamada (equivalente a soltar o drag)', () => {
    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'a', type: 'task', label: 'A' },
      { id: 'b', type: 'task', label: 'B' },
      { id: 'c', type: 'task', label: 'C' },
      { id: 'd', type: 'task', label: 'D' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [
      { id: 'e1', from: 'start', to: 'a' },
      { id: 'e2', from: 'a', to: 'b' },
      { id: 'e3', from: 'b', to: 'c' },
      { id: 'e4', from: 'c', to: 'd' },
      { id: 'e5', from: 'd', to: 'end' },
    ];
    setGraph(fixture, nodes, edges);
    // entries: [start(0), a(1), b(2), c(3), d(4), end(5)]
    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));

    // arrastar "d" (index 4) direto para a posição de "a" (index 1) — uma única ação
    comp.onCdkDrop({ previousIndex: 4, currentIndex: 1 });

    setGraph(fixture, emitted!.nodes, emitted!.edges);
    const order = comp
      .entries()
      .filter((e: any) => e.kind === 'step')
      .map((e: any) => e.node.id);
    expect(order).toEqual(['start', 'd', 'a', 'b', 'c', 'end']);
  });

  it('moveUp troca duas etapas simples adjacentes', () => {
    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'a', type: 'task', label: 'A' },
      { id: 'b', type: 'task', label: 'B' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [
      { id: 'e1', from: 'start', to: 'a' },
      { id: 'e2', from: 'a', to: 'b' },
      { id: 'e3', from: 'b', to: 'end' },
    ];
    setGraph(fixture, nodes, edges);
    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));
    comp.moveUp(2); // troca b (index 2) com a (index 1)

    expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: 'start', to: 'b' });
    expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: 'b', to: 'a' });
    expect(emitted!.edges).toContainEqual({ id: expect.any(String), from: 'a', to: 'end' });
    expect(emitted!.edges.length).toBe(3);
  });

  it('marca os itens trocados como "recém-movidos" e remove o destaque após o timeout', () => {
    vi.useFakeTimers();
    try {
      const nodes: QuestNode[] = [
        { id: 'start', type: 'start', label: 'início' },
        { id: 'a', type: 'task', label: 'A' },
        { id: 'b', type: 'task', label: 'B' },
        { id: 'end', type: 'end', label: 'fim' },
      ];
      const edges: QuestEdge[] = [
        { id: 'e1', from: 'start', to: 'a' },
        { id: 'e2', from: 'a', to: 'b' },
        { id: 'e3', from: 'b', to: 'end' },
      ];
      setGraph(fixture, nodes, edges);
      comp.moveUp(2);

      expect(comp.recentlyMovedIds().has('a')).toBe(true);
      expect(comp.recentlyMovedIds().has('b')).toBe(true);

      vi.advanceTimersByTime(900);
      expect(comp.recentlyMovedIds().size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('não permite mover o nó start ou o nó end', () => {
    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'mid', type: 'task', label: 'meio' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [
      { id: 'e1', from: 'start', to: 'mid' },
      { id: 'e2', from: 'mid', to: 'end' },
    ];
    setGraph(fixture, nodes, edges);
    expect(comp.canMoveUp(0)).toBe(false); // start
    expect(comp.canMoveUp(1)).toBe(false); // moveria start
    expect(comp.canMoveDown(1)).toBe(false); // moveria end
  });

  it('deleteStep não remove nada quando a confirmação é cancelada', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [QuestEditorList],
      providers: [{ provide: ConfirmService, useValue: { ask: () => of(false) } }],
    });
    fixture = TestBed.createComponent(QuestEditorList);
    comp = fixture.componentInstance;

    const nodes: QuestNode[] = [
      { id: 'start', type: 'start', label: 'início' },
      { id: 'mid', type: 'task', label: 'meio' },
      { id: 'end', type: 'end', label: 'fim' },
    ];
    const edges: QuestEdge[] = [
      { id: 'e1', from: 'start', to: 'mid' },
      { id: 'e2', from: 'mid', to: 'end' },
    ];
    setGraph(fixture, nodes, edges);
    let emitted = false;
    comp.graphChange.subscribe(() => (emitted = true));
    comp.deleteStep('mid');
    expect(emitted).toBe(false);
  });

  it('undo desfaz addStep e redo refaz', () => {
    setGraph(fixture, [{ id: 'start', type: 'start', label: 'início' }], []);
    let emitted: { nodes: QuestNode[]; edges: QuestEdge[] } | undefined;
    comp.graphChange.subscribe((v: any) => (emitted = v));

    comp.addStep();
    expect(emitted!.nodes.length).toBe(2);
    expect(comp.canUndo()).toBe(true);

    setGraph(fixture, emitted!.nodes, emitted!.edges);
    comp.undo();
    expect(emitted!.nodes.length).toBe(1);
    expect(comp.canRedo()).toBe(true);

    setGraph(fixture, emitted!.nodes, emitted!.edges);
    comp.redo();
    expect(emitted!.nodes.length).toBe(2);
  });
});
