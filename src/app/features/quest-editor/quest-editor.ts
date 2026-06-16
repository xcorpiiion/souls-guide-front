import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  QuestApi,
  QuestEdge,
  QuestEndingType,
  QuestNode,
  QuestNodeType,
  QuestStatus,
} from '../../shared/models/quest.model';
import { QuestService } from '../../core/services/quest.service';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { ToastService } from '../../shared/components/toast/toast.service';
import { NodePosition, QuestEditorCanvas } from './quest-editor-canvas/quest-editor-canvas';

export type EditorTool = 'select' | 'connect';
type SelectedItem = { kind: 'node'; id: string } | { kind: 'edge'; id: string } | null;

interface HistoryEntry {
  nodes: QuestNode[];
  edges: QuestEdge[];
  positions: Map<string, NodePosition>;
}

const NW_BASE: Record<QuestNodeType, number> = {
  start: 44,
  end: 44,
  task: 110,
  gateway: 44,
  'external-quest': 110,
};

const CHAR_W = 7.2;
const TEXT_H_PAD = 28;
function editorNodeW(node: QuestNode): number {
  const base = NW_BASE[node.type];
  if (node.type !== 'task' && node.type !== 'external-quest') return base;
  const computed = Math.ceil((node.label ?? '').length * CHAR_W) + TEXT_H_PAD * 2;
  return Math.max(base, Math.min(320, computed));
}
const NH: Record<QuestNodeType, number> = {
  start: 44,
  end: 44,
  task: 50,
  gateway: 44,
  'external-quest': 50,
};
const H_GAP = 52;
const V_GAP = 32;
const PAD = 28;

function bfsPositions(nodes: QuestNode[], edges: QuestEdge[]): Map<string, NodePosition> {
  if (!nodes.length) return new Map();
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
  const pos = new Map<string, NodePosition>();
  let x = PAD;
  for (const l of sortedLayers) {
    const ids = byLayer.get(l)!;
    const colW = Math.max(...ids.map((id) => editorNodeW(nodeMap.get(id)!)));
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

function snap(v: number): number {
  return Math.round(v / 8) * 8;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

@Component({
  selector: 'app-quest-editor',
  imports: [FormsModule, QuestEditorCanvas],
  templateUrl: './quest-editor.html',
  styleUrl: './quest-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestEditor implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questService = inject(QuestService);
  private readonly toast = inject(ToastService);

  protected readonly gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
  private readonly questId = this.route.snapshot.paramMap.get('questId');
  protected readonly isEdit = !!this.questId;
  protected readonly loading = signal(false);
  private readonly isDirty = signal(false);

  // ─── quest metadata ───────────────────────────────────────────────────────
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly questStatus = signal<QuestStatus>('TEORIA');

  // ─── graph state ─────────────────────────────────────────────────────────
  protected readonly nodes = signal<QuestNode[]>([]);
  protected readonly edges = signal<QuestEdge[]>([]);
  protected readonly positions = signal<Map<string, NodePosition>>(new Map());

  // ─── undo/redo ────────────────────────────────────────────────────────────
  private readonly history = signal<HistoryEntry[]>([]);
  private readonly historyIdx = signal(-1);
  protected readonly canUndo = computed(() => this.historyIdx() > 0);
  protected readonly canRedo = computed(() => this.historyIdx() < this.history().length - 1);

  // ─── editor state ────────────────────────────────────────────────────────
  protected readonly tool = signal<EditorTool>('select');
  protected readonly selected = signal<SelectedItem>(null);
  protected readonly fitTrigger = signal(0);
  protected readonly propsWidth = signal(256);
  private resizeDrag: { startX: number; startW: number } | null = null;

  protected readonly selectedNode = computed((): QuestNode | null => {
    const s = this.selected();
    if (s?.kind !== 'node') return null;
    return this.nodes().find((n) => n.id === s.id) ?? null;
  });

  protected readonly selectedEdge = computed((): QuestEdge | null => {
    const s = this.selected();
    if (s?.kind !== 'edge') return null;
    return this.edges().find((e) => e.id === s.id) ?? null;
  });

  protected readonly selectedNodeId = computed(() => {
    const s = this.selected();
    return s?.kind === 'node' ? s.id : null;
  });

  protected readonly selectedEdgeId = computed(() => {
    const s = this.selected();
    return s?.kind === 'edge' ? s.id : null;
  });

  constructor() {
    if (!this.isEdit) {
      const startId = makeId('n');
      this.nodes.set([{ id: startId, type: 'start', label: 'início' }]);
      const pos = new Map<string, NodePosition>();
      pos.set(startId, { x: 60, y: 220 });
      this.positions.set(pos);
      this.pushHistory(false);
    }
  }

  ngOnInit(): void {
    if (this.isEdit && this.questId) {
      this.loading.set(true);
      this.questService.get(this.questId).subscribe({
        next: (api) => {
          this.loadFromApi(api);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.cancel();
        },
      });
    }
  }

  private loadFromApi(api: QuestApi): void {
    this.title.set(api.title);
    this.description.set(api.description ?? '');
    this.questStatus.set(api.status ?? 'TEORIA');
    const nodes = api.nodes ?? [];
    const edges = api.edges ?? [];
    this.nodes.set([...nodes]);
    this.edges.set([...edges]);
    this.positions.set(bfsPositions(nodes, edges));
    this.pushHistory(false);
    this.isDirty.set(false);
  }

  // ─── history ──────────────────────────────────────────────────────────────
  private pushHistory(markDirty = true): void {
    const snap: HistoryEntry = {
      nodes: [...this.nodes()],
      edges: [...this.edges()],
      positions: new Map(this.positions()),
    };
    const stack = this.history().slice(0, this.historyIdx() + 1);
    stack.push(snap);
    if (stack.length > 60) stack.shift();
    this.history.set(stack);
    this.historyIdx.set(stack.length - 1);
    if (markDirty) this.isDirty.set(true);
  }

  protected undo(): void {
    const idx = this.historyIdx();
    if (idx <= 0) return;
    const newIdx = idx - 1;
    this.historyIdx.set(newIdx);
    this.restoreHistory(newIdx);
  }

  protected redo(): void {
    const idx = this.historyIdx();
    const stack = this.history();
    if (idx >= stack.length - 1) return;
    const newIdx = idx + 1;
    this.historyIdx.set(newIdx);
    this.restoreHistory(newIdx);
  }

  private restoreHistory(idx: number): void {
    const entry = this.history()[idx];
    this.nodes.set([...entry.nodes]);
    this.edges.set([...entry.edges]);
    this.positions.set(new Map(entry.positions));
    this.selected.set(null);
  }

  // ─── keyboard shortcuts ───────────────────────────────────────────────────
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent): void {
    if (this.isDirty()) {
      e.preventDefault();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName ?? '';
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      this.undo();
      return;
    }
    if (e.ctrlKey && (e.key === 'y' || e.key === 'Z')) {
      e.preventDefault();
      this.redo();
      return;
    }
    if (isTyping) return;

    if (e.key === 's' || e.key === 'S') this.tool.set('select');
    if (e.key === 'c' || e.key === 'C') this.tool.set('connect');
    if (e.key === '0') this.fitTrigger.update((n) => n + 1);
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected()) {
      this.deleteSelected();
    }
  }

  // ─── toolbar / palette actions ────────────────────────────────────────────
  protected autoLayout(): void {
    const newPos = bfsPositions(this.nodes(), this.edges());
    if (!newPos.size) return;
    this.positions.set(newPos);
    this.fitTrigger.update((n) => n + 1);
    this.pushHistory();
  }

  protected setTool(t: EditorTool): void {
    this.tool.set(t);
  }

  protected addNode(type: QuestNodeType): void {
    const id = makeId('n');
    const defaultLabel: Record<QuestNodeType, string> = {
      start: 'início',
      end: 'fim',
      task: 'novo nó',
      gateway: 'X',
      'external-quest': 'quest externa',
    };
    const node: QuestNode = { id, type, label: defaultLabel[type] };
    const existingNodes = this.nodes();
    const existing = this.positions();
    const newPos = new Map(existing);
    this.nodes.update((ns) => [...ns, node]);

    // ── inserir entre aresta selecionada ──────────────────────────────────
    const sel = this.selected();
    if (sel?.kind === 'edge') {
      const edge = this.edges().find((e) => e.id === sel.id);
      if (edge) {
        const fp = existing.get(edge.from);
        const tp = existing.get(edge.to);
        if (fp && tp) {
          newPos.set(id, { x: snap((fp.x + tp.x) / 2), y: snap((fp.y + tp.y) / 2) });
        } else {
          newPos.set(id, { x: 200, y: 200 });
        }
        const e1 = makeId('e');
        const e2 = makeId('e');
        this.edges.update((es) => [
          ...es.filter((e) => e.id !== sel.id),
          { id: e1, from: edge.from, to: id },
          { id: e2, from: id, to: edge.to },
        ]);
        this.positions.set(newPos);
        this.selected.set({ kind: 'node', id });
        this.tool.set('select');
        this.pushHistory();
        return;
      }
    }

    // ── auto-conectar ao nó source ─────────────────────────────────────────
    let autoFromId: string | null = null;
    if (type !== 'start') {
      // preferir o nó selecionado se não for 'end'
      if (sel?.kind === 'node') {
        const selNode = existingNodes.find((n) => n.id === sel.id);
        if (selNode && selNode.type !== 'end') autoFromId = sel.id;
      }
      // senão, pegar o último nó que não seja 'end'
      if (!autoFromId) {
        const lastNonEnd = [...existingNodes].reverse().find((n) => n.type !== 'end');
        autoFromId = lastNonEnd?.id ?? null;
      }
    }

    // posicionar à direita do nó de origem, ou em grade
    if (autoFromId) {
      const fromPos = existing.get(autoFromId);
      const fromNode = existingNodes.find((n) => n.id === autoFromId);
      if (fromPos && fromNode) {
        newPos.set(id, { x: snap(fromPos.x + editorNodeW(fromNode) + 80), y: fromPos.y });
      } else {
        newPos.set(id, { x: 80 + existing.size * 180, y: 80 });
      }
      const edgeExists = this.edges().some((e) => e.from === autoFromId && e.to === id);
      if (!edgeExists) {
        const edgeId = makeId('e');
        this.edges.update((es) => [...es, { id: edgeId, from: autoFromId!, to: id }]);
      }
    } else {
      const count = existing.size;
      newPos.set(id, { x: 80 + (count % 5) * 180, y: 80 + Math.floor(count / 5) * 120 });
    }

    this.positions.set(newPos);
    this.selected.set({ kind: 'node', id });
    this.tool.set('select');
    this.pushHistory();
  }

  protected deleteSelected(): void {
    const s = this.selected();
    if (!s) return;
    if (s.kind === 'node') {
      this.nodes.update((ns) => ns.filter((n) => n.id !== s.id));
      this.edges.update((es) => es.filter((e) => e.from !== s.id && e.to !== s.id));
      const pos = new Map(this.positions());
      pos.delete(s.id);
      this.positions.set(pos);
    } else {
      this.edges.update((es) => es.filter((e) => e.id !== s.id));
    }
    this.selected.set(null);
    this.pushHistory();
  }

  // ─── canvas events ────────────────────────────────────────────────────────
  protected onPositionChange(ev: { id: string; x: number; y: number }): void {
    if (!isFinite(ev.x) || !isFinite(ev.y)) return;
    const pos = new Map(this.positions());
    pos.set(ev.id, { x: ev.x, y: ev.y });
    this.positions.set(pos);
  }

  protected onNodeDragEnd(): void {
    this.pushHistory();
  }

  protected onNodeSelect(id: string | null): void {
    this.selected.set(id ? { kind: 'node', id } : null);
  }

  protected onEdgeSelect(id: string | null): void {
    this.selected.set(id ? { kind: 'edge', id } : null);
  }

  protected onConnect(ev: { from: string; to: string }): void {
    if (ev.from === ev.to) return;
    const fromNode = this.nodes().find((n) => n.id === ev.from);
    if (fromNode?.type === 'end') return;
    const exists = this.edges().some((e) => e.from === ev.from && e.to === ev.to);
    if (exists) return;
    const id = makeId('e');
    this.edges.update((es) => [...es, { id, from: ev.from, to: ev.to }]);
    this.tool.set('select');
    this.pushHistory();
  }

  // ─── properties panel ────────────────────────────────────────────────────
  protected updateNodeType(value: QuestNodeType): void {
    const s = this.selected();
    if (s?.kind !== 'node') return;
    const resetFields: Partial<QuestNode> = {
      sublabel: null,
      description: null,
      location: null,
      tags: undefined,
      endingType: null,
      linkedQuestId: null,
      linkedQuestName: null,
    };
    const labelDefaults: Record<QuestNodeType, string> = {
      start: 'início',
      end: 'fim',
      task: 'novo nó',
      gateway: 'X',
      'external-quest': 'quest externa',
    };
    this.nodes.update((ns) =>
      ns.map((n) =>
        n.id === s.id ? { ...n, ...resetFields, type: value, label: labelDefaults[value] } : n,
      ),
    );
    this.pushHistory();
  }

  protected updateNodeLabel(value: string): void {
    this.updateNodeField('label', value);
  }
  protected updateNodeSublabel(value: string): void {
    this.updateNodeField('sublabel', value || null);
  }
  protected updateNodeDescription(value: string): void {
    this.updateNodeField('description', value || null);
  }
  protected updateNodeLocation(value: string): void {
    this.updateNodeField('location', value || null);
  }
  protected updateNodeTags(value: string): void {
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    this.updateNodeField('tags', tags.length ? tags : undefined);
  }
  protected updateNodeEndingType(value: string): void {
    this.updateNodeField('endingType', (value as QuestEndingType) || null);
  }
  protected updateNodeLinkedQuestId(value: string): void {
    this.updateNodeField('linkedQuestId', value || null);
  }
  protected updateNodeLinkedQuestName(value: string): void {
    this.updateNodeField('linkedQuestName', value || null);
  }

  private updateNodeField<K extends keyof QuestNode>(field: K, value: QuestNode[K]): void {
    const s = this.selected();
    if (s?.kind !== 'node') return;
    this.nodes.update((ns) => ns.map((n) => (n.id === s.id ? { ...n, [field]: value } : n)));
  }

  protected updateEdgeLabel(value: string): void {
    const s = this.selected();
    if (s?.kind !== 'edge') return;
    this.edges.update((es) => es.map((e) => (e.id === s.id ? { ...e, label: value || null } : e)));
  }

  // ─── save ─────────────────────────────────────────────────────────────────
  protected saveQuest(): void {
    const request = {
      title: this.title() || 'Nova Quest',
      description: this.description(),
      status: this.questStatus(),
      gameId: Number(this.gameId),
      nodes: this.nodes(),
      edges: this.edges(),
    };

    if (this.isEdit && this.questId) {
      this.questService.update(this.questId, request).subscribe({
        next: () => {
          this.isDirty.set(false);
          this.router.navigate(['/games', this.gameId, 'quests', this.questId]);
        },
        error: (err) => {
          if (err.status === 403) {
            this.toast.error(
              'Acesso negado',
              'Você está temporariamente banido de fazer edições. Aguarde o período de ban expirar.',
            );
          } else {
            this.toast.error('Erro', 'Não foi possível salvar a quest. Tente novamente.');
          }
        },
      });
    } else {
      this.questService.create(request).subscribe({
        next: (created) => {
          this.isDirty.set(false);
          this.router.navigate(['/games', this.gameId, 'quests', created.id]);
        },
        error: () => this.toast.error('Erro', 'Não foi possível criar a quest. Tente novamente.'),
      });
    }
  }

  protected onPropsResizeStart(event: MouseEvent): void {
    event.preventDefault();
    this.resizeDrag = { startX: event.clientX, startW: this.propsWidth() };
    const onMove = (e: MouseEvent) => {
      if (!this.resizeDrag) return;
      const delta = this.resizeDrag.startX - e.clientX;
      this.propsWidth.set(Math.max(200, Math.min(520, this.resizeDrag.startW + delta)));
    };
    const onUp = () => {
      this.resizeDrag = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  hasUnsavedChanges(): boolean {
    return this.isDirty();
  }

  protected markDirty(): void {
    this.isDirty.set(true);
  }

  protected cancel(): void {
    if (this.isEdit && this.questId) {
      this.router.navigate(['/games', this.gameId, 'quests', this.questId]);
    } else {
      this.router.navigate(['/games', this.gameId]);
    }
  }

  // ─── template helpers ─────────────────────────────────────────────────────
  protected nodeTagsString(node: QuestNode): string {
    return node.tags?.join(', ') ?? '';
  }

  protected edgeFromLabel(edge: QuestEdge): string {
    return this.nodes().find((n) => n.id === edge.from)?.label ?? edge.from;
  }

  protected edgeToLabel(edge: QuestEdge): string {
    return this.nodes().find((n) => n.id === edge.to)?.label ?? edge.to;
  }

  protected readonly paletteNodes: {
    type: QuestNodeType;
    label: string;
    desc: string;
  }[] = [
    { type: 'start', label: 'início', desc: 'ponto de partida' },
    { type: 'task', label: 'tarefa', desc: 'ação / diálogo' },
    { type: 'gateway', label: 'bifurcação', desc: 'divisão de caminho' },
    { type: 'external-quest', label: 'quest externa', desc: 'cruza outra questline' },
    { type: 'end', label: 'final', desc: 'desfecho da quest' },
  ];

  protected readonly statuses: { value: QuestStatus; label: string }[] = [
    { value: 'TEORIA', label: 'teoria' },
    { value: 'CONSOLIDADO', label: 'consolidado' },
    { value: 'CANONICO', label: 'canônico' },
  ];

  protected readonly endingTypes: { value: string; label: string }[] = [
    { value: '', label: '— nenhum —' },
    { value: 'positive', label: 'positivo' },
    { value: 'tragic', label: 'trágico' },
    { value: 'neutral', label: 'neutro' },
  ];
}
