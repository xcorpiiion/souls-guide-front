import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { QuestEdge, QuestNode } from '../../../shared/models/quest.model';

interface LayoutNode extends QuestNode {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface LayoutEdge {
  id: string;
  path: string;
  isExternal: boolean;
}
interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

const NW: Record<string, number> = {
  start: 44,
  end: 44,
  task: 110,
  gateway: 44,
  'external-quest': 110,
};
const NH: Record<string, number> = {
  start: 44,
  end: 44,
  task: 50,
  gateway: 44,
  'external-quest': 50,
};
const H_GAP = 52;
const V_GAP = 32;
const PAD = 28;

function buildLayout(nodes: QuestNode[], edges: QuestEdge[]): GraphLayout {
  if (!nodes.length) return { nodes: [], edges: [], width: 0, height: 100 };

  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) adj.get(e.from)?.push(e.to);

  const layers = new Map<string, number>();
  const origin = nodes.find((n) => n.type === 'start') ?? nodes[0];
  const q = [origin.id];
  layers.set(origin.id, 0);
  while (q.length) {
    const curr = q.shift()!;
    for (const next of adj.get(curr) ?? []) {
      if (!layers.has(next)) {
        layers.set(next, layers.get(curr)! + 1);
        q.push(next);
      }
    }
  }
  const maxL = Math.max(0, ...layers.values());
  for (const n of nodes) if (!layers.has(n.id)) layers.set(n.id, maxL + 1);

  const byLayer = new Map<number, string[]>();
  for (const [id, l] of layers) {
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
  }
  const sortedLayers = [...byLayer.keys()].sort((a, b) => a - b);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const maxColH = Math.max(
    ...sortedLayers.map((l) => {
      const ids = byLayer.get(l)!;
      return ids.reduce((s, id) => s + NH[nodeMap.get(id)!.type], 0) + (ids.length - 1) * V_GAP;
    }),
  );
  const canvasH = maxColH + PAD * 2;

  const pos = new Map<string, { x: number; y: number }>();
  let x = PAD;
  for (const l of sortedLayers) {
    const ids = byLayer.get(l)!;
    const colW = Math.max(...ids.map((id) => NW[nodeMap.get(id)!.type]));
    const colH = ids.reduce((s, id) => s + NH[nodeMap.get(id)!.type], 0) + (ids.length - 1) * V_GAP;
    let y = (canvasH - colH) / 2;
    for (const id of ids) {
      pos.set(id, { x, y });
      y += NH[nodeMap.get(id)!.type] + V_GAP;
    }
    x += colW + H_GAP;
  }
  const canvasW = x - H_GAP + PAD;

  const layoutNodes: LayoutNode[] = nodes.map((n) => ({
    ...n,
    x: pos.get(n.id)!.x,
    y: pos.get(n.id)!.y,
    w: NW[n.type],
    h: NH[n.type],
  }));

  const lnMap = new Map(layoutNodes.map((n) => [n.id, n]));
  const layoutEdges: LayoutEdge[] = edges.map((e) => {
    const f = lnMap.get(e.from)!;
    const t = lnMap.get(e.to)!;
    const x1 = f.x + f.w,
      y1 = f.y + f.h / 2;
    const x2 = t.x,
      y2 = t.y + t.h / 2;
    const cx = (x1 + x2) / 2;
    return {
      id: e.id,
      path: `M ${x1},${y1} C ${cx},${y1} ${cx},${y2} ${x2},${y2}`,
      isExternal: t.type === 'external-quest',
    };
  });

  return { nodes: layoutNodes, edges: layoutEdges, width: canvasW, height: canvasH };
}

@Component({
  selector: 'app-quest-graph',
  templateUrl: './quest-graph.html',
  styleUrl: './quest-graph.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestGraph {
  readonly nodes = input<QuestNode[]>([]);
  readonly edges = input<QuestEdge[]>([]);
  readonly selectedNodeId = input<string | null>(null);
  readonly nodeSelect = output<string>();

  protected readonly layout = computed(() => buildLayout(this.nodes(), this.edges()));

  protected diamondPoints(n: LayoutNode): string {
    const { x, y, w, h } = n;
    return `${x},${y + h / 2} ${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h}`;
  }

  protected textY(n: LayoutNode): number {
    return n.sublabel ? n.y + 17 : n.y + n.h / 2 + 4;
  }

  protected onNodeClick(id: string): void {
    this.nodeSelect.emit(id);
  }

  protected trackEdge(_: number, e: LayoutEdge): string {
    return e.id;
  }
  protected trackNode(_: number, n: LayoutNode): string {
    return n.id;
  }
}
