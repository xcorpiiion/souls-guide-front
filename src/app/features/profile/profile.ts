import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuestDetailData, QuestNodeType, QuestStatus } from '../../shared/models/quest.model';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';
import { MY_PROFILE } from './profile.mocks';

type ProfileTab = 'quests' | 'seguindo' | 'favoritos';

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

export interface MiniNode {
  id: string;
  type: QuestNodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface MiniEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function buildMiniGraph(
  quest: QuestDetailData,
  W = 48,
  H = 32,
): { nodes: MiniNode[]; edges: MiniEdge[] } {
  const nodes = quest.nodes;
  const edges = quest.edges;
  if (!nodes.length) return { nodes: [], edges: [] };

  // BFS layers
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
  for (const n of nodes)
    if (!layers.has(n.id)) layers.set(n.id, Math.max(0, ...layers.values()) + 1);
  const byLayer = new Map<number, string[]>();
  for (const [id, l] of layers) {
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(id);
  }
  const sortedLayers = [...byLayer.keys()].sort((a, b) => a - b);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  let x = 0;
  for (const l of sortedLayers) {
    const ids = byLayer.get(l)!;
    const colW = Math.max(...ids.map((id) => NW[nodeMap.get(id)!.type]));
    let y = 0;
    for (const id of ids) {
      pos.set(id, { x, y });
      y += NH[nodeMap.get(id)!.type] + 32;
    }
    x += colW + 52;
  }

  // scale to W x H
  const allX = [...pos.values()].flatMap((p) => [p.x, p.x + 110]);
  const allY = [...pos.values()].flatMap((p) => [p.y, p.y + 50]);
  const minX = Math.min(...allX),
    maxX = Math.max(...allX);
  const minY = Math.min(...allY),
    maxY = Math.max(...allY);
  const pad = 3;
  const scale = Math.min((W - pad * 2) / (maxX - minX || 1), (H - pad * 2) / (maxY - minY || 1));
  const offX = pad + (W - pad * 2 - (maxX - minX) * scale) / 2 - minX * scale;
  const offY = pad + (H - pad * 2 - (maxY - minY) * scale) / 2 - minY * scale;

  const miniNodes: MiniNode[] = nodes.map((n) => {
    const p = pos.get(n.id) ?? { x: 0, y: 0 };
    const mx = p.x * scale + offX;
    const my = p.y * scale + offY;
    const mw = NW[n.type] * scale;
    const mh = NH[n.type] * scale;
    return { id: n.id, type: n.type, x: mx, y: my, w: mw, h: mh, cx: mx + mw / 2, cy: my + mh / 2 };
  });

  const nodeById = new Map(miniNodes.map((n) => [n.id, n]));
  const miniEdges: MiniEdge[] = edges.flatMap((e) => {
    const f = nodeById.get(e.from),
      t = nodeById.get(e.to);
    if (!f || !t) return [];
    return [{ x1: f.x + f.w, y1: f.cy, x2: t.x, y2: t.cy }];
  });

  return { nodes: miniNodes, edges: miniEdges };
}

@Component({
  selector: 'app-profile',
  imports: [RouterLink, LowerCasePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  protected readonly profile = MY_PROFILE;
  protected readonly activeTab = signal<ProfileTab>('quests');

  protected readonly myQuests = computed(() =>
    QUESTS_DETAIL.filter((q) => this.profile.myQuestIds.includes(q.id)),
  );

  protected readonly followedQuests = computed(() =>
    QUESTS_DETAIL.filter((q) => this.profile.followedQuestIds.includes(q.id)),
  );

  protected miniGraph(quest: QuestDetailData) {
    return buildMiniGraph(quest);
  }

  protected statusLabel(s: QuestStatus): string {
    return ({ TEORIA: 'teoria', CONSOLIDADO: 'consolidado', CANONICO: 'canônico' } as const)[s];
  }

  protected activityLabel(type: string): string {
    return (
      (
        { created: 'Criou', updated: 'Atualizou', followed: 'Começou a seguir' } as Record<
          string,
          string
        >
      )[type] ?? type
    );
  }

  protected activityDot(type: string): string {
    return (
      (
        { created: 'dot--green', updated: 'dot--gold', followed: 'dot--blue' } as Record<
          string,
          string
        >
      )[type] ?? 'dot--gray'
    );
  }

  protected daysLabel(d: number): string {
    if (d === 0) return 'hoje';
    if (d === 1) return 'ontem';
    if (d < 7) return `há ${d} dias`;
    return `há ${Math.round(d / 7)} sem`;
  }

  protected readonly gameIconColor: Record<string, string> = {
    'elden-ring': 'game-icon--gold',
    bloodborne: 'game-icon--purple',
    'dark-souls-3': 'game-icon--blue',
  };
}
