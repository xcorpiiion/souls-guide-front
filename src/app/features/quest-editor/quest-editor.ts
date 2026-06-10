import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  QuestDetailData,
  QuestEdge,
  QuestEndingType,
  QuestNode,
  QuestNodeType,
  QuestStatus,
} from '../../shared/models/quest.model';
import { GAMES_DETAIL } from '../game-detail/game-detail.mocks';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';
import { NodePosition, QuestEditorCanvas } from './quest-editor-canvas/quest-editor-canvas';

export type EditorTool = 'select' | 'connect';
type SelectedItem = { kind: 'node'; id: string } | { kind: 'edge'; id: string } | null;

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
    const colW = Math.max(...ids.map((id) => NW[nodeMap.get(id)!.type]));
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
export class QuestEditor {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
  private readonly questId = this.route.snapshot.paramMap.get('questId');
  protected readonly isEdit = !!this.questId;
  protected readonly gameName = GAMES_DETAIL.find((g) => g.id === this.gameId)?.name ?? this.gameId;

  // ─── quest metadata ───────────────────────────────────────────────────────
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly questStatus = signal<QuestStatus>('TEORIA');

  // ─── graph state ─────────────────────────────────────────────────────────
  protected readonly nodes = signal<QuestNode[]>([]);
  protected readonly edges = signal<QuestEdge[]>([]);
  protected readonly positions = signal<Map<string, NodePosition>>(new Map());

  // ─── editor state ────────────────────────────────────────────────────────
  protected readonly tool = signal<EditorTool>('select');
  protected readonly selected = signal<SelectedItem>(null);

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
    if (this.isEdit && this.questId) {
      const q = QUESTS_DETAIL.find((x) => x.id === this.questId);
      if (q) this.loadQuest(q);
    } else {
      const startId = makeId('n');
      this.nodes.set([{ id: startId, type: 'start', label: 'início' }]);
      const pos = new Map<string, NodePosition>();
      pos.set(startId, { x: 60, y: 200 });
      this.positions.set(pos);
    }
  }

  private loadQuest(q: QuestDetailData): void {
    this.title.set(q.title);
    this.description.set(q.description);
    this.questStatus.set(q.status);
    this.nodes.set([...q.nodes]);
    this.edges.set([...q.edges]);
    this.positions.set(bfsPositions(q.nodes, q.edges));
  }

  // ─── toolbar actions ─────────────────────────────────────────────────────
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
    this.nodes.update((ns) => [...ns, node]);
    const existing = this.positions();
    const count = existing.size;
    const pos = new Map(existing);
    pos.set(id, { x: 80 + (count % 6) * 140, y: 60 + Math.floor(count / 6) * 120 });
    this.positions.set(pos);
    this.selected.set({ kind: 'node', id });
    this.tool.set('select');
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
  }

  // ─── canvas events ────────────────────────────────────────────────────────
  protected onPositionChange(ev: { id: string; x: number; y: number }): void {
    const pos = new Map(this.positions());
    pos.set(ev.id, { x: ev.x, y: ev.y });
    this.positions.set(pos);
  }

  protected onNodeSelect(id: string | null): void {
    this.selected.set(id ? { kind: 'node', id } : null);
  }

  protected onEdgeSelect(id: string | null): void {
    this.selected.set(id ? { kind: 'edge', id } : null);
  }

  protected onConnect(ev: { from: string; to: string }): void {
    if (ev.from === ev.to) return;
    const exists = this.edges().some((e) => e.from === ev.from && e.to === ev.to);
    if (exists) return;
    const id = makeId('e');
    this.edges.update((es) => [...es, { id, from: ev.from, to: ev.to }]);
    this.tool.set('select');
  }

  // ─── properties panel ────────────────────────────────────────────────────
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
    const nodes = this.nodes();
    const edges = this.edges();
    const stepCount = nodes.filter((n) => n.type !== 'start').length;
    const forkCount = nodes.filter((n) => n.type === 'gateway').length;
    const endingCount = nodes.filter((n) => n.type === 'end').length;
    const game = GAMES_DETAIL.find((g) => g.id === this.gameId);

    if (this.isEdit && this.questId) {
      const idx = QUESTS_DETAIL.findIndex((q) => q.id === this.questId);
      if (idx !== -1) {
        QUESTS_DETAIL[idx] = {
          ...QUESTS_DETAIL[idx],
          title: this.title(),
          description: this.description(),
          status: this.questStatus(),
          nodes,
          edges,
          stepCount,
          forkCount,
          endingCount,
        };
      }
      this.router.navigate(['/games', this.gameId, 'quests', this.questId]);
    } else {
      const id = makeId('q');
      const newQuest: QuestDetailData = {
        id,
        title: this.title() || 'Nova Quest',
        gameId: this.gameId,
        gameName: game?.name ?? this.gameId,
        description: this.description(),
        status: this.questStatus(),
        followers: 0,
        author: null,
        stepCount,
        forkCount,
        endingCount,
        nodes,
        edges,
        relatedQuests: [],
      };
      QUESTS_DETAIL.push(newQuest);
      this.router.navigate(['/games', this.gameId, 'quests', id]);
    }
  }

  protected cancel(): void {
    if (this.isEdit && this.questId) {
      this.router.navigate(['/games', this.gameId, 'quests', this.questId]);
    } else {
      this.router.navigate(['/games', this.gameId]);
    }
  }

  // ─── constants for template ───────────────────────────────────────────────
  protected readonly nodeTypes: { type: QuestNodeType; label: string; hint: string }[] = [
    { type: 'task', label: '+ tarefa', hint: 'nó de ação ou diálogo' },
    { type: 'gateway', label: '+ bifurcação', hint: 'divisão de caminho' },
    { type: 'end', label: '+ final', hint: 'desfecho da quest' },
    { type: 'external-quest', label: '+ externa ↗', hint: 'cruza com outra questline' },
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

  protected nodeTagsString(node: QuestNode): string {
    return node.tags?.join(', ') ?? '';
  }
}
