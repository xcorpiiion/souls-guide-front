import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { QuestEdge, QuestNode } from '../../../shared/models/quest.model';

export interface ForkOption {
  firstNode: QuestNode;
  subSteps: QuestNode[];
}

export interface StepEntry {
  kind: 'step';
  node: QuestNode;
}
export interface ForkEntry {
  kind: 'fork';
  id: string;
  options: ForkOption[];
  convergesTo: string | null;
}
export type ListEntry = StepEntry | ForkEntry;

function bfsOrder(start: string, adj: Map<string, string[]>): string[] {
  const visited = new Set<string>();
  const q = [start];
  const result: string[] = [];
  while (q.length) {
    const cur = q.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    result.push(cur);
    for (const next of adj.get(cur) ?? []) q.push(next);
  }
  return result;
}

function findConvergence(children: string[], adj: Map<string, string[]>): string | null {
  if (children.length < 2) return null;
  const ordered = bfsOrder(children[0], adj);
  const rest = children.slice(1).map((c) => new Set(bfsOrder(c, adj)));
  for (const id of ordered) {
    if (rest.every((s) => s.has(id))) return id;
  }
  return null;
}

function collectBranch(
  startId: string,
  stopAt: string | null,
  adj: Map<string, string[]>,
  nodeMap: Map<string, QuestNode>,
): QuestNode[] {
  const result: QuestNode[] = [];
  let cur: string | null = startId;
  const seen = new Set<string>();
  while (cur && cur !== stopAt && !seen.has(cur)) {
    seen.add(cur);
    const node = nodeMap.get(cur);
    if (!node) break;
    result.push(node);
    cur = (adj.get(cur) ?? [])[0] ?? null;
  }
  return result;
}

export function buildEntries(nodes: QuestNode[], edges: QuestEdge[]): ListEntry[] {
  if (!nodes.length) return [];
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) adj.get(e.from)?.push(e.to);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const start = nodes.find((n) => n.type === 'start') ?? nodes[0];

  const result: ListEntry[] = [];
  let cur: string | null = start.id;
  const visited = new Set<string>();

  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const node = nodeMap.get(cur);
    if (!node) break;
    const children: string[] = adj.get(cur) ?? [];

    if (children.length > 1) {
      const conv = findConvergence(children, adj);
      const options: ForkOption[] = children.map((childId) => {
        const branch = collectBranch(childId, conv, adj, nodeMap);
        return { firstNode: branch[0] ?? nodeMap.get(childId)!, subSteps: branch.slice(1) };
      });
      result.push({ kind: 'fork', id: cur, options, convergesTo: conv });
      cur = conv;
    } else {
      result.push({ kind: 'step', node });
      cur = children[0] ?? null;
    }
  }
  return result;
}

@Component({
  selector: 'app-quest-checklist',
  imports: [RouterLink],
  templateUrl: './quest-checklist.html',
  styleUrl: './quest-checklist.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestChecklist {
  protected readonly auth = inject(AuthService);

  readonly nodes = input<QuestNode[]>([]);
  readonly edges = input<QuestEdge[]>([]);
  readonly completedNodeIds = input<Set<string>>(new Set());
  readonly togglingNodeId = input<string | null>(null);
  readonly gameId = input<string>('');

  readonly nodeSelect = output<string>();
  readonly nodeDoneToggle = output<string>();

  protected readonly selectedId = signal<string | null>(null);
  protected readonly closedForks = signal<Set<string>>(new Set());

  protected readonly entries = computed(() => buildEntries(this.nodes(), this.edges()));

  protected readonly selectedNode = computed<QuestNode | null>(() => {
    const id = this.selectedId();
    return id ? (this.nodes().find((n) => n.id === id) ?? null) : null;
  });

  protected select(id: string): void {
    this.selectedId.set(id);
    this.nodeSelect.emit(id);
  }

  protected toggleFork(id: string): void {
    this.closedForks.update((s) => {
      const next = new Set(s);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected isForkOpen(id: string): boolean {
    return !this.closedForks().has(id);
  }

  protected toggleDone(nodeId: string): void {
    this.nodeDoneToggle.emit(nodeId);
  }

  protected endingLabel(type: string | null | undefined): string {
    if (type === 'positive') return 'final positivo';
    if (type === 'tragic') return 'final trágico';
    return 'final';
  }
}
