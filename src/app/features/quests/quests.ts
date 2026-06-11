import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuestStatus } from '../../shared/models/quest.model';
import { buildMiniGraph, MiniEdge, MiniNode } from '../../shared/utils/mini-graph';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';

const GAME_FILTERS = [
  { id: '', label: 'todos' },
  { id: 'elden-ring', label: 'Elden Ring' },
  { id: 'bloodborne', label: 'Bloodborne' },
  { id: 'dark-souls-3', label: 'Dark Souls III' },
  { id: 'lies-of-p', label: 'Lies of P' },
];

const STATUS_FILTERS: { id: QuestStatus | ''; label: string }[] = [
  { id: '', label: 'todos' },
  { id: 'CANONICO', label: 'canônico' },
  { id: 'CONSOLIDADO', label: 'consolidado' },
  { id: 'TEORIA', label: 'teoria' },
];

@Component({
  selector: 'app-quests',
  imports: [RouterLink, LowerCasePipe],
  templateUrl: './quests.html',
  styleUrl: './quests.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Quests {
  protected readonly gameFilters = GAME_FILTERS;
  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly loading = signal(true);
  protected readonly skeletonItems = Array.from({ length: 5 });

  protected readonly search = signal('');
  protected readonly gameFilter = signal('');
  protected readonly statusFilter = signal<QuestStatus | ''>('');

  constructor() {
    setTimeout(() => this.loading.set(false), 600);
  }

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const game = this.gameFilter();
    const status = this.statusFilter();
    return QUESTS_DETAIL.filter(
      (quest) =>
        (!game || quest.gameId === game) &&
        (!status || quest.status === status) &&
        (!q ||
          quest.title.toLowerCase().includes(q) ||
          quest.description.toLowerCase().includes(q)),
    );
  });

  protected miniGraph(quest: (typeof QUESTS_DETAIL)[0]): { nodes: MiniNode[]; edges: MiniEdge[] } {
    return buildMiniGraph(quest, 64, 40);
  }

  protected statusLabel(s: QuestStatus): string {
    const map: Record<QuestStatus, string> = {
      TEORIA: 'teoria',
      CONSOLIDADO: 'consolidado',
      CANONICO: 'canônico',
    };
    return map[s];
  }

  protected followersLabel(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }
}
