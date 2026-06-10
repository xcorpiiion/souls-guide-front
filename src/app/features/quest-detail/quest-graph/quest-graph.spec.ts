import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { QuestGraph } from './quest-graph';
import { QuestNode, QuestEdge } from '../../../shared/models/quest.model';

const MOCK_NODES: QuestNode[] = [
  { id: 'n0', type: 'start', label: 'início' },
  { id: 'n1', type: 'task', label: 'Tarefa A', sublabel: 'Local A' },
  { id: 'n2', type: 'end', label: 'fim', endingType: 'positive' },
];

const MOCK_EDGES: QuestEdge[] = [
  { id: 'e0', from: 'n0', to: 'n1' },
  { id: 'e1', from: 'n1', to: 'n2' },
];

describe('QuestGraph', () => {
  let fixture: ComponentFixture<QuestGraph>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [QuestGraph] }).compileComponents();
    fixture = TestBed.createComponent(QuestGraph);
    fixture.componentRef.setInput('nodes', MOCK_NODES);
    fixture.componentRef.setInput('edges', MOCK_EDGES);
    fixture.componentRef.setInput('selectedNodeId', null);
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve renderizar um elemento SVG', () => {
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('deve renderizar o número correto de nós', () => {
    const groups = fixture.nativeElement.querySelectorAll('.quest-graph__node');
    expect(groups.length).toBe(MOCK_NODES.length);
  });

  it('deve renderizar o número correto de arestas', () => {
    const paths = fixture.nativeElement.querySelectorAll('.quest-graph__edge');
    expect(paths.length).toBe(MOCK_EDGES.length);
  });

  it('deve aplicar classe --selected ao nó selecionado', () => {
    fixture.componentRef.setInput('selectedNodeId', 'n1');
    fixture.detectChanges();
    const selected = fixture.nativeElement.querySelectorAll('.quest-graph__node--selected');
    expect(selected.length).toBe(1);
  });

  it('não deve ter nó selecionado quando selectedNodeId é null', () => {
    fixture.componentRef.setInput('selectedNodeId', null);
    fixture.detectChanges();
    const selected = fixture.nativeElement.querySelectorAll('.quest-graph__node--selected');
    expect(selected.length).toBe(0);
  });

  it('deve emitir nodeSelect ao clicar em um nó', () => {
    const emits: string[] = [];
    fixture.componentInstance.nodeSelect.subscribe((id: string) => emits.push(id));
    const firstNode = fixture.nativeElement.querySelector('.quest-graph__node') as HTMLElement;
    firstNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(emits).toContain('n0');
  });

  it('deve gerar SVG com dimensões positivas', () => {
    const svg = fixture.nativeElement.querySelector('svg') as SVGSVGElement;
    expect(Number(svg.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(0);
  });

  it('deve marcar arestas externas com classe --ext', () => {
    const extNodes: QuestNode[] = [
      { id: 'a', type: 'start', label: 'início' },
      { id: 'b', type: 'external-quest', label: 'Ext', sublabel: null },
    ];
    const extEdges: QuestEdge[] = [{ id: 'e', from: 'a', to: 'b' }];
    fixture.componentRef.setInput('nodes', extNodes);
    fixture.componentRef.setInput('edges', extEdges);
    fixture.detectChanges();
    const extEdge = fixture.nativeElement.querySelector('.quest-graph__edge--ext');
    expect(extEdge).toBeTruthy();
  });

  it('deve renderizar diamante para nó do tipo gateway', () => {
    const gatewayNodes: QuestNode[] = [
      { id: 'a', type: 'start', label: 'início' },
      { id: 'b', type: 'gateway', label: 'X' },
    ];
    fixture.componentRef.setInput('nodes', gatewayNodes);
    fixture.componentRef.setInput('edges', [{ id: 'e', from: 'a', to: 'b' }]);
    fixture.detectChanges();
    const diamond = fixture.nativeElement.querySelector('.quest-graph__diamond');
    expect(diamond).toBeTruthy();
  });
});
