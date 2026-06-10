import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { QuestEdge, QuestNode, QuestNodeType } from '../../../shared/models/quest.model';
import { EditorTool } from '../quest-editor';

const NW: Record<QuestNodeType, number> = {
  start: 44,
  end: 44,
  task: 110,
  gateway: 44,
  'external-quest': 110,
};
const NH: Record<QuestNodeType, number> = {
  start: 44,
  end: 44,
  task: 50,
  gateway: 44,
  'external-quest': 50,
};

export const CANVAS_W = 1400;
export const CANVAS_H = 640;
const GRID = 8;

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

  readonly positionChange = output<{ id: string; x: number; y: number }>();
  readonly nodeSelect = output<string | null>();
  readonly edgeSelect = output<string | null>();
  readonly connectNodes = output<{ from: string; to: string }>();

  protected readonly CANVAS_W = CANVAS_W;
  protected readonly CANVAS_H = CANVAS_H;

  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svgEl');
  private drag: { nodeId: string; offX: number; offY: number } | null = null;
  protected readonly connectSource = signal<string | null>(null);

  protected readonly canvasEdges = computed((): CanvasEdge[] => {
    const pos = this.positions();
    const nodeMap = new Map(this.nodes().map((n) => [n.id, n]));
    return this.edges().flatMap((e) => {
      const f = nodeMap.get(e.from);
      const t = nodeMap.get(e.to);
      const fp = pos.get(e.from);
      const tp = pos.get(e.to);
      if (!f || !t || !fp || !tp) return [];
      const x1 = fp.x + NW[f.type],
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

  private svgPoint(event: MouseEvent): NodePosition {
    const svg = this.svgRef()?.nativeElement;
    if (!svg || typeof svg.createSVGPoint !== 'function') return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  protected nw(type: QuestNodeType): number {
    return NW[type];
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
      y = this.py(id),
      w = 44,
      h = 44;
    return `${x},${y + h / 2} ${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h}`;
  }

  protected textY(id: string, type: QuestNodeType, hasSublabel: boolean): number {
    return hasSublabel ? this.py(id) + 17 : this.py(id) + NH[type] / 2 + 4;
  }

  protected onNodeMouseDown(event: MouseEvent, id: string): void {
    event.stopPropagation();
    if (this.tool() === 'connect') {
      const src = this.connectSource();
      if (!src) {
        this.connectSource.set(id);
        this.nodeSelect.emit(id);
      } else if (src !== id) {
        this.connectNodes.emit({ from: src, to: id });
        this.connectSource.set(null);
        this.nodeSelect.emit(null);
      } else {
        this.connectSource.set(null);
      }
      return;
    }
    this.nodeSelect.emit(id);
    const { x, y } = this.svgPoint(event);
    const pos = this.positions().get(id);
    if (!pos) return;
    this.drag = { nodeId: id, offX: x - pos.x, offY: y - pos.y };
  }

  protected onMouseMove(event: MouseEvent): void {
    if (!this.drag) return;
    const { x, y } = this.svgPoint(event);
    this.positionChange.emit({
      id: this.drag.nodeId,
      x: snap(Math.max(0, Math.min(CANVAS_W - 120, x - this.drag.offX))),
      y: snap(Math.max(0, Math.min(CANVAS_H - 60, y - this.drag.offY))),
    });
  }

  protected onMouseUp(): void {
    this.drag = null;
  }

  protected onSvgClick(event: MouseEvent): void {
    if ((event.target as Element).closest('[data-node-id]')) return;
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
}
