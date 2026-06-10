import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { GameDetailData } from '../../shared/models/game.model';
import { QuestStatus } from '../../shared/models/quest.model';
import { GAMES_DETAIL } from './game-detail.mocks';

type Tab = 'quests' | 'lore' | 'contributors';
type QuestFilter = QuestStatus | 'todos';

interface FilterOption {
  value: QuestFilter;
  label: string;
}

@Component({
  selector: 'app-game-detail',
  imports: [RouterLink],
  templateUrl: './game-detail.html',
  styleUrl: './game-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetail {
  private readonly route = inject(ActivatedRoute);

  protected readonly game: GameDetailData | null =
    GAMES_DETAIL.find((g) => g.id === (this.route.snapshot.paramMap.get('id') ?? '')) ?? null;

  protected readonly activeTab = signal<Tab>('quests');
  protected readonly activeFilter = signal<QuestFilter>('todos');

  protected readonly filters: FilterOption[] = [
    { value: 'todos', label: 'todos' },
    { value: 'CANONICO', label: 'canônico' },
    { value: 'CONSOLIDADO', label: 'consolidado' },
    { value: 'TEORIA', label: 'teoria' },
  ];

  protected readonly filteredQuests = computed(() => {
    if (!this.game) return [];
    const filter = this.activeFilter();
    return filter === 'todos'
      ? this.game.quests
      : this.game.quests.filter((q) => q.status === filter);
  });

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  protected setFilter(filter: QuestFilter): void {
    this.activeFilter.set(filter);
  }

  protected trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
