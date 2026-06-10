import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { QuestEditorCanvas } from './quest-editor-canvas';
import { QuestNode, QuestEdge } from '../../../shared/models/quest.model';

const NODES: QuestNode[] = [
  { id: 'n0', type: 'start', label: 'início' },
  { id: 'n1', type: 'task', label: 'Passo 1' },
  { id: 'n2', type: 'end', label: 'fim' },
];
const EDGES: QuestEdge[] = [
  { id: 'e0', from: 'n0', to: 'n1' },
  { id: 'e1', from: 'n1', to: 'n2' },
];
const POS = new Map([
  ['n0', { x: 60, y: 200 }],
  ['n1', { x: 200, y: 190 }],
  ['n2', { x: 400, y: 200 }],
]);

function createFixture() {
  TestBed.configureTestingModule({ imports: [QuestEditorCanvas] });
  const f = TestBed.createComponent(QuestEditorCanvas);
  f.componentRef.setInput('nodes', NODES);
  f.componentRef.setInput('edges', EDGES);
  f.componentRef.setInput('positions', POS);
  f.detectChanges();
  return f;
}

describe('QuestEditorCanvas', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const f = createFixture();
    expect(f.componentInstance).toBeTruthy();
  });

  it('deve renderizar SVG', () => {
    const f = createFixture();
    expect(f.nativeElement.querySelector('svg')).toBeTruthy();
  });

  it('deve renderizar 3 nós', () => {
    const f = createFixture();
    const nodes = f.nativeElement.querySelectorAll('[data-node-id]');
    expect(nodes.length).toBe(3);
  });

  it('deve renderizar 2 arestas', () => {
    const f = createFixture();
    const paths = f.nativeElement.querySelectorAll('.qec__edge') as NodeListOf<SVGPathElement>;
    expect(paths.length).toBe(2);
  });

  it('deve aplicar classe --selected no nó selecionado', () => {
    const f = createFixture();
    f.componentRef.setInput('selectedNodeId', 'n1');
    f.detectChanges();
    const node = f.nativeElement.querySelector('[data-node-id="n1"]') as Element;
    expect(node.classList.contains('qec__node--selected')).toBe(true);
  });

  it('deve aplicar classe --selected na aresta selecionada', () => {
    const f = createFixture();
    f.componentRef.setInput('selectedEdgeId', 'e0');
    f.detectChanges();
    const edges = f.nativeElement.querySelectorAll('.qec__edge--selected') as NodeListOf<Element>;
    expect(edges.length).toBe(1);
  });

  it('deve emitir nodeSelect ao clicar em nó no modo select', () => {
    const f = createFixture();
    f.componentRef.setInput('tool', 'select');
    f.detectChanges();
    let emitted: string | null = undefined as unknown as string | null;
    f.componentInstance.nodeSelect.subscribe((v) => (emitted = v));
    const node = f.nativeElement.querySelector('[data-node-id="n1"]') as HTMLElement;
    node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(emitted).toBe('n1');
  });

  it('deve usar cursor crosshair no modo connect', () => {
    const f = createFixture();
    f.componentRef.setInput('tool', 'connect');
    f.detectChanges();
    const svg = f.nativeElement.querySelector('svg') as SVGSVGElement;
    expect(svg.classList.contains('qec__svg--connect')).toBe(true);
  });

  it('deve emitir connectNodes ao clicar dois nós no modo connect', () => {
    const f = createFixture();
    f.componentRef.setInput('tool', 'connect');
    f.detectChanges();
    let emitted: { from: string; to: string } | null = null;
    f.componentInstance.connectNodes.subscribe((v) => (emitted = v));
    const n0 = f.nativeElement.querySelector('[data-node-id="n0"]') as HTMLElement;
    const n2 = f.nativeElement.querySelector('[data-node-id="n2"]') as HTMLElement;
    n0.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    n2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(emitted).toEqual({ from: 'n0', to: 'n2' });
  });

  it('não deve emitir connectNodes ao clicar no mesmo nó duas vezes', () => {
    const f = createFixture();
    f.componentRef.setInput('tool', 'connect');
    f.detectChanges();
    let emitted = false;
    f.componentInstance.connectNodes.subscribe(() => (emitted = true));
    const n0 = f.nativeElement.querySelector('[data-node-id="n0"]') as HTMLElement;
    n0.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    n0.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(emitted).toBe(false);
  });

  it('deve renderizar nó gateway como polygon', () => {
    TestBed.configureTestingModule({ imports: [QuestEditorCanvas] });
    const f = TestBed.createComponent(QuestEditorCanvas);
    const gw: QuestNode[] = [{ id: 'g0', type: 'gateway', label: 'X' }];
    f.componentRef.setInput('nodes', gw);
    f.componentRef.setInput('edges', []);
    f.componentRef.setInput('positions', new Map([['g0', { x: 100, y: 100 }]]));
    f.detectChanges();
    expect(f.nativeElement.querySelector('.qec__diamond')).toBeTruthy();
  });
});
