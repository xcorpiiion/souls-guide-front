import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { QuestEdge, QuestNode, QuestNodeType } from '../../../shared/models/quest.model';

// ─── sizing (mirrors editor canvas) ───────────────────────────────────────────
const NW_BASE: Record<QuestNodeType, number> = {
  start: 56,
  end: 56,
  task: 150,
  gateway: 56,
  'external-quest': 150,
};
const NH: Record<QuestNodeType, number> = {
  start: 56,
  end: 56,
  task: 64,
  gateway: 56,
  'external-quest': 64,
};

function nodeW(n: QuestNode): number {
  if (n.type !== 'task' && n.type !== 'external-quest') return NW_BASE[n.type];
  return Math.max(150, Math.min(300, Math.ceil((n.label ?? '').length * 7.2) + 56));
}

// ─── BFS auto-layout ──────────────────────────────────────────────────────────
interface NodePos {
  x: number;
  y: number;
}

function computePositions(nodes: QuestNode[], edges: QuestEdge[]): Map<string, NodePos> {
  if (!nodes.length) return new Map();
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) adj.get(e.from)?.push(e.to);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const layers = new Map<string, number>();
  const origin = nodes.find((n) => n.type === 'start') ?? nodes[0];
  const q = [origin.id];
  layers.set(origin.id, 0);
  while (q.length) {
    const cur = q.shift()!;
    for (const next of adj.get(cur) ?? []) {
      if (!layers.has(next)) {
        layers.set(next, layers.get(cur)! + 1);
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

  const H_GAP = 60;
  const V_GAP = 36;
  const PAD = 40;

  const maxColH = Math.max(
    ...sortedLayers.map((l) => {
      const ids = byLayer.get(l)!;
      return ids.reduce((s, id) => s + NH[nodeMap.get(id)!.type], 0) + (ids.length - 1) * V_GAP;
    }),
  );
  const canvasH = maxColH + PAD * 2;

  const pos = new Map<string, NodePos>();
  let x = PAD;
  for (const l of sortedLayers) {
    const ids = byLayer.get(l)!;
    const colW = Math.max(...ids.map((id) => nodeW(nodeMap.get(id)!)));
    const colH = ids.reduce((s, id) => s + NH[nodeMap.get(id)!.type], 0) + (ids.length - 1) * V_GAP;
    let y = (canvasH - colH) / 2;
    for (const id of ids) {
      pos.set(id, { x, y });
      y += NH[nodeMap.get(id)!.type] + V_GAP;
    }
    x += colW + H_GAP;
  }
  return pos;
}

// ─── canvas edge ──────────────────────────────────────────────────────────────
interface CanvasEdge {
  id: string;
  path: string;
  isExternal: boolean;
  mx: number;
  my: number;
  label?: string | null;
}
interface MinimapNode {
  id: string;
  type: QuestNodeType;
  x: number;
  y: number;
  w: number;
  h: number;
}

const MM_W = 120;
const MM_H = 72;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

@Component({
  selector: 'app-quest-view-canvas',
  templateUrl: './quest-view-canvas.html',
  styleUrl: './quest-view-canvas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestViewCanvas {
  readonly nodes = input<QuestNode[]>([]);
  readonly edges = input<QuestEdge[]>([]);
  readonly completedNodeIds = input<Set<string>>(new Set());
  readonly selectedNodeId = input<string | null>(null);

  readonly nodeSelect = output<string | null>();

  protected readonly zoom = signal(1);
  protected readonly panX = signal(40);
  protected readonly panY = signal(40);
  protected readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  protected readonly MM_W = MM_W;
  protected readonly MM_H = MM_H;
  protected readonly Math = Math;
  protected readonly canUnzoomMore = computed(() => this.zoom() > MIN_ZOOM + 0.01);
  protected readonly canZoomMore = computed(() => this.zoom() < MAX_ZOOM - 0.01);

  private readonly elRef = inject(ElementRef<HTMLElement>);
  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svgEl');
  private panStart: { x: number; y: number; px: number; py: number } | null = null;
  private wasPan = false;

  protected readonly positions = computed(() => computePositions(this.nodes(), this.edges()));

  protected readonly canvasEdges = computed((): CanvasEdge[] => {
    const pos = this.positions();
    const nodeMap = new Map(this.nodes().map((n) => [n.id, n]));
    return this.edges().flatMap((e) => {
      const f = nodeMap.get(e.from);
      const t = nodeMap.get(e.to);
      const fp = pos.get(e.from);
      const tp = pos.get(e.to);
      if (!f || !t || !fp || !tp) return [];
      const x1 = fp.x + nodeW(f),
        y1 = fp.y + NH[f.type] / 2;
      const x2 = tp.x,
        y2 = tp.y + NH[t.type] / 2;
      const cx = (x1 + x2) / 2;
      return [
        {
          id: e.id,
          path: `M ${x1},${y1} C ${cx},${y1} ${cx},${y2} ${x2},${y2}`,
          isExternal: t.type === 'external-quest',
          mx: cx,
          my: (y1 + y2) / 2 - 8,
          label: e.label,
        },
      ];
    });
  });

  protected readonly minimapNodes = computed((): MinimapNode[] => {
    const nodes = this.nodes();
    const pos = this.positions();
    if (!nodes.length) return [];
    const pad = 20;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const n of nodes) {
      const p = pos.get(n.id);
      if (!p) continue;
      xs.push(p.x - pad, p.x + nodeW(n) + pad);
      ys.push(p.y - pad, p.y + NH[n.type] + pad);
    }
    if (!xs.length) return [];
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const scale = Math.min(MM_W / contentW, MM_H / contentH);
    const offX = (MM_W - contentW * scale) / 2 - minX * scale;
    const offY = (MM_H - contentH * scale) / 2 - minY * scale;
    return nodes.map((n) => {
      const p = pos.get(n.id) ?? { x: 0, y: 0 };
      return {
        id: n.id,
        type: n.type,
        x: p.x * scale + offX,
        y: p.y * scale + offY,
        w: nodeW(n) * scale,
        h: NH[n.type] * scale,
      };
    });
  });

  constructor() {
    afterNextRender(() => {
      this.elRef.nativeElement.addEventListener(
        'wheel',
        (e: WheelEvent) => {
          e.preventDefault();
          this.handleWheel(e);
        },
        { passive: false },
      );
      // double rAF ensures browser has painted and SVG has real dimensions
      requestAnimationFrame(() => requestAnimationFrame(() => this.fitAll()));
    });
  }

  private handleWheel(e: WheelEvent): void {
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const oldZoom = this.zoom();
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
    const rect = (this.svgRef()?.nativeElement ?? this.elRef.nativeElement).getBoundingClientRect();
    this.panX.update(
      (px) => e.clientX - rect.left - (e.clientX - rect.left - px) * (newZoom / oldZoom),
    );
    this.panY.update(
      (py) => e.clientY - rect.top - (e.clientY - rect.top - py) * (newZoom / oldZoom),
    );
    this.zoom.set(newZoom);
  }

  private applyZoom(newZoom: number): void {
    const el = this.svgRef()?.nativeElement ?? this.elRef.nativeElement;
    const cx = (el.clientWidth || 600) / 2;
    const cy = (el.clientHeight || 400) / 2;
    const oldZoom = this.zoom();
    this.panX.update((px) => cx - (cx - px) * (newZoom / oldZoom));
    this.panY.update((py) => cy - (cy - py) * (newZoom / oldZoom));
    this.zoom.set(newZoom);
  }

  protected zoomStep(dir: 1 | -1): void {
    const cur = this.zoom();
    const next =
      dir > 0
        ? ZOOM_STEPS.find((s) => s > cur + 0.01)
        : [...ZOOM_STEPS].reverse().find((s) => s < cur - 0.01);
    if (next !== undefined) this.applyZoom(next);
  }

  protected zoomReset(): void {
    this.applyZoom(1);
  }

  protected fitAll(): void {
    const nodes = this.nodes();
    const pos = this.positions();
    if (!nodes.length) return;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const n of nodes) {
      const p = pos.get(n.id);
      if (!p) continue;
      xs.push(p.x, p.x + nodeW(n));
      ys.push(p.y, p.y + NH[n.type]);
    }
    const safeXs = xs.filter(isFinite);
    const safeYs = ys.filter(isFinite);
    if (!safeXs.length) return;
    const PAD = 48;
    const minX = Math.min(...safeXs),
      maxX = Math.max(...safeXs);
    const minY = Math.min(...safeYs),
      maxY = Math.max(...safeYs);
    const el = this.svgRef()?.nativeElement ?? this.elRef.nativeElement;
    const W = el.clientWidth || 600;
    const H = el.clientHeight || 400;
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(
        MAX_ZOOM,
        Math.min((W - PAD * 2) / (maxX - minX || 1), (H - PAD * 2) / (maxY - minY || 1)),
      ),
    );
    this.zoom.set(newZoom);
    this.panX.set(PAD + (W - PAD * 2 - (maxX - minX) * newZoom) / 2 - minX * newZoom);
    this.panY.set(PAD + (H - PAD * 2 - (maxY - minY) * newZoom) / 2 - minY * newZoom);
  }

  // ─── coord helpers ────────────────────────────────────────────────────────
  protected nw(node: QuestNode): number {
    return nodeW(node);
  }
  protected nh(type: QuestNodeType): number {
    return NH[type];
  }
  protected px(id: string): number {
    return this.positions().get(id)?.x ?? 0;
  }
  protected py(id: string): number {
    return this.positions().get(id)?.y ?? 0;
  }

  protected diamondPoints(id: string): string {
    const x = this.px(id),
      y = this.py(id);
    return `${x},${y + 28} ${x + 28},${y} ${x + 56},${y + 28} ${x + 28},${y + 56}`;
  }
  protected mmDiamond(n: MinimapNode): string {
    return `${n.x},${n.y + n.h / 2} ${n.x + n.w / 2},${n.y} ${n.x + n.w},${n.y + n.h / 2} ${n.x + n.w / 2},${n.y + n.h}`;
  }
  protected textY(id: string, type: QuestNodeType, hasSub: boolean): number {
    return hasSub ? this.py(id) + 22 : this.py(id) + NH[type] / 2 + 5;
  }
  protected gridPatternTransform(): string {
    return `translate(${this.panX() % 24},${this.panY() % 24})`;
  }
  protected contentTransform(): string {
    return `translate(${this.panX()},${this.panY()}) scale(${this.zoom()})`;
  }

  // ─── interaction ──────────────────────────────────────────────────────────
  protected onSvgMouseDown(event: MouseEvent): void {
    const target = event.target as Element;
    if (target.closest('[data-node-id]')) return;
    this.panStart = { x: event.clientX, y: event.clientY, px: this.panX(), py: this.panY() };
    this.wasPan = false;
  }

  protected onMouseMove(event: MouseEvent): void {
    if (!this.panStart) return;
    const dx = event.clientX - this.panStart.x;
    const dy = event.clientY - this.panStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.wasPan = true;
    this.panX.set(this.panStart.px + dx);
    this.panY.set(this.panStart.py + dy);
  }

  protected onMouseUp(): void {
    this.panStart = null;
  }

  protected onSvgClick(event: MouseEvent): void {
    if (this.wasPan) {
      this.wasPan = false;
      return;
    }
    const target = event.target as Element;
    if (!target.closest('[data-node-id]')) this.nodeSelect.emit(null);
  }

  protected onNodeClick(event: MouseEvent, id: string): void {
    event.stopPropagation();
    if (this.wasPan) return;
    this.nodeSelect.emit(this.selectedNodeId() === id ? null : id);
  }

  protected trackNode(_: number, n: QuestNode): string {
    return n.id;
  }
  protected trackEdge(_: number, e: CanvasEdge): string {
    return e.id;
  }
  protected trackMm(_: number, n: MinimapNode): string {
    return n.id;
  }
}
