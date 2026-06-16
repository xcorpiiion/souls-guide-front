import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { QuestEdge, QuestNode, QuestNodeType } from '../../../shared/models/quest.model';
import { EditorTool } from '../quest-editor';

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
const CHAR_W = 7.2;
const TEXT_H_PAD = 28;

function nodeW(node: QuestNode): number {
  const base = NW_BASE[node.type];
  if (node.type !== 'task' && node.type !== 'external-quest') return base;
  const computed = Math.ceil((node.label ?? '').length * CHAR_W) + TEXT_H_PAD * 2;
  return Math.max(base, Math.min(320, computed));
}
const GRID = 8;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
export const MM_W = 120;
export const MM_H = 72;
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

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

export interface NodePosition {
  x: number;
  y: number;
}

@Component({
  selector: 'app-quest-editor-canvas',
  templateUrl: './quest-editor-canvas.html',
  styleUrl: './quest-editor-canvas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestEditorCanvas {
  readonly nodes = input<QuestNode[]>([]);
  readonly edges = input<QuestEdge[]>([]);
  readonly positions = input<Map<string, NodePosition>>(new Map());
  readonly selectedNodeId = input<string | null>(null);
  readonly selectedEdgeId = input<string | null>(null);
  readonly tool = input<EditorTool>('select');
  readonly fitTrigger = input<number>(0);

  readonly positionChange = output<{ id: string; x: number; y: number }>();
  readonly nodeDragEnd = output<string>();
  readonly nodeSelect = output<string | null>();
  readonly edgeSelect = output<string | null>();
  readonly connectNodes = output<{ from: string; to: string }>();

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

  private drag: {
    nodeId: string;
    startX: number;
    startY: number;
    startClientX: number;
    startClientY: number;
  } | null = null;
  private panStart: { x: number; y: number; px: number; py: number } | null = null;
  private wasPan = false;

  // connect state
  protected readonly connectSource = signal<string | null>(null);
  // hover state for handles
  protected readonly hoveredNodeId = signal<string | null>(null);
  // edge preview while dragging handle
  protected readonly edgeDrawPos = signal<NodePosition | null>(null);

  protected readonly isDrawingEdge = computed(() => !!this.connectSource() && !!this.edgeDrawPos());

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
    });

    effect(() => {
      const t = this.fitTrigger();
      if (t > 0) this.fitAll();
    });
  }

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

  private svgPoint(event: MouseEvent): NodePosition {
    const el = this.svgRef()?.nativeElement ?? this.elRef.nativeElement;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left - this.panX()) / this.zoom();
    const y = (event.clientY - rect.top - this.panY()) / this.zoom();
    return { x, y };
  }

  private handleWheel(e: WheelEvent): void {
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const oldZoom = this.zoom();
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
    const rect = (this.svgRef()?.nativeElement ?? this.elRef.nativeElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.panX.update((px) => mx - (mx - px) * (newZoom / oldZoom));
    this.panY.update((py) => my - (my - py) * (newZoom / oldZoom));
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

    const PAD = 60;
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

  // ─── coordinate helpers ─────────────────────────────────────────────────────
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

  // right-edge handle position
  protected handleX(id: string): number {
    const node = this.nodes().find((n) => n.id === id);
    return node ? this.px(id) + nodeW(node) : 0;
  }
  protected handleY(id: string): number {
    const node = this.nodes().find((n) => n.id === id);
    return node ? this.py(id) + NH[node.type] / 2 : 0;
  }

  protected diamondPoints(id: string): string {
    const x = this.px(id),
      y = this.py(id),
      w = 44,
      h = 44;
    return `${x},${y + h / 2} ${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h}`;
  }

  protected mmDiamond(n: MinimapNode): string {
    return `${n.x},${n.y + n.h / 2} ${n.x + n.w / 2},${n.y} ${n.x + n.w},${n.y + n.h / 2} ${n.x + n.w / 2},${n.y + n.h}`;
  }

  protected textY(id: string, type: QuestNodeType, hasSublabel: boolean): number {
    return hasSublabel ? this.py(id) + 22 : this.py(id) + NH[type] / 2 + 5;
  }

  protected gridPatternTransform(): string {
    return `translate(${this.panX() % 24},${this.panY() % 24})`;
  }

  protected contentTransform(): string {
    return `translate(${this.panX()},${this.panY()}) scale(${this.zoom()})`;
  }

  // ─── connect helpers ─────────────────────────────────────────────────────────
  protected showHandle(id: string): boolean {
    const node = this.nodes().find((n) => n.id === id);
    if (node?.type === 'end') return false;
    if (this.tool() === 'connect') return true;
    return this.tool() === 'select' && !this.drag && this.hoveredNodeId() === id;
  }

  protected showTargetHint(id: string): boolean {
    // highlight all other nodes as drop targets while drawing an edge
    const src = this.connectSource();
    return !!src && src !== id;
  }

  // ─── interaction ─────────────────────────────────────────────────────────────
  protected onHandleMouseDown(event: MouseEvent, id: string): void {
    const node = this.nodes().find((n) => n.id === id);
    if (node?.type === 'end') return;
    event.stopPropagation();
    this.connectSource.set(id);
    this.nodeSelect.emit(id);
    this.edgeDrawPos.set(this.svgPoint(event));
  }

  protected onNodeMouseDown(event: MouseEvent, id: string): void {
    event.stopPropagation();

    // handle drag-connect via connect tool (click-click mode)
    if (this.tool() === 'connect') {
      const src = this.connectSource();
      if (!src) {
        this.connectSource.set(id);
        this.nodeSelect.emit(id);
      } else if (src !== id) {
        this.connectNodes.emit({ from: src, to: id });
        this.connectSource.set(null);
        this.edgeDrawPos.set(null);
        this.nodeSelect.emit(null);
      } else {
        this.connectSource.set(null);
        this.edgeDrawPos.set(null);
      }
      return;
    }

    // if an edge draw is in progress and user clicks a target node → complete edge
    if (this.connectSource() && this.edgeDrawPos()) {
      const src = this.connectSource()!;
      if (src !== id) {
        this.connectNodes.emit({ from: src, to: id });
      }
      this.connectSource.set(null);
      this.edgeDrawPos.set(null);
      this.nodeSelect.emit(null);
      return;
    }

    // normal select + drag
    this.nodeSelect.emit(id);
    const pos = this.positions().get(id);
    if (!pos) return;
    this.drag = {
      nodeId: id,
      startX: pos.x,
      startY: pos.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  }

  protected onSvgMouseDown(event: MouseEvent): void {
    const target = event.target as Element;
    if (target.closest('[data-node-id]') || target.closest('[data-edge-id]')) return;
    this.panStart = { x: event.clientX, y: event.clientY, px: this.panX(), py: this.panY() };
    this.wasPan = false;
  }

  protected onMouseMove(event: MouseEvent): void {
    if (this.drag) {
      const zoom = this.zoom();
      const dx = (event.clientX - this.drag.startClientX) / zoom;
      const dy = (event.clientY - this.drag.startClientY) / zoom;
      this.positionChange.emit({
        id: this.drag.nodeId,
        x: snap(Math.max(0, this.drag.startX + dx)),
        y: snap(Math.max(0, this.drag.startY + dy)),
      });
    } else if (this.isDrawingEdge()) {
      // update edge preview line
      this.edgeDrawPos.set(this.svgPoint(event));
    } else if (this.panStart) {
      const dx = event.clientX - this.panStart.x;
      const dy = event.clientY - this.panStart.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.wasPan = true;
      this.panX.set(this.panStart.px + dx);
      this.panY.set(this.panStart.py + dy);
    }
  }

  protected onMouseUp(event: MouseEvent): void {
    if (this.drag) {
      this.nodeDragEnd.emit(this.drag.nodeId);
      this.drag = null;
    }

    // released on canvas (not on a node) → cancel edge draw
    if (this.isDrawingEdge()) {
      const target = event.target as Element;
      const targetNode = target.closest('[data-node-id]');
      if (!targetNode) {
        this.connectSource.set(null);
        this.edgeDrawPos.set(null);
      }
    }

    this.panStart = null;
  }

  protected onNodeMouseUp(event: MouseEvent, id: string): void {
    // complete edge draw on node release
    if (this.isDrawingEdge()) {
      event.stopPropagation();
      const src = this.connectSource()!;
      if (src !== id) {
        this.connectNodes.emit({ from: src, to: id });
      }
      this.connectSource.set(null);
      this.edgeDrawPos.set(null);
      this.nodeSelect.emit(null);
    }
  }

  protected onSvgEscKey(): void {
    this.connectSource.set(null);
    this.edgeDrawPos.set(null);
    this.nodeSelect.emit(null);
    this.edgeSelect.emit(null);
  }

  protected onSvgClick(event: MouseEvent): void {
    if (this.wasPan) {
      this.wasPan = false;
      return;
    }
    const target = event.target as Element;
    if (target.closest('[data-node-id]')) return;
    if (target.closest('[data-edge-id]')) return;
    if (this.tool() === 'connect') this.connectSource.set(null);
    this.nodeSelect.emit(null);
    this.edgeSelect.emit(null);
  }

  protected onEdgeClick(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.edgeSelect.emit(id);
    this.nodeSelect.emit(null);
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
