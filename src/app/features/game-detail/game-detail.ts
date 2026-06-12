import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Game, gameToSummary, GameSummary } from '../../shared/models/game.model';
import { QuestStatus, QuestSummary } from '../../shared/models/quest.model';
import { LoreSummary } from '../../shared/models/lore-article.model';
import { GameService } from '../../core/services/game.service';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';

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
export class GameDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private readonly questService = inject(QuestService);
  private readonly loreService = inject(LoreService);

  private readonly gameId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly game = signal<GameSummary | null>(null);
  protected readonly quests = signal<QuestSummary[]>([]);
  protected readonly loreArticles = signal<LoreSummary[]>([]);

  protected readonly activeTab = signal<Tab>('quests');
  protected readonly activeFilter = signal<QuestFilter>('todos');

  protected readonly filters: FilterOption[] = [
    { value: 'todos', label: 'todos' },
    { value: 'CANONICO', label: 'canônico' },
    { value: 'CONSOLIDADO', label: 'consolidado' },
    { value: 'TEORIA', label: 'teoria' },
  ];

  protected readonly filteredQuests = computed(() => {
    const filter = this.activeFilter();
    return filter === 'todos' ? this.quests() : this.quests().filter((q) => q.status === filter);
  });

  ngOnInit(): void {
    this.gameService.get(this.gameId).subscribe({
      next: (g: Game) => {
        this.game.set(gameToSummary(g));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Jogo não encontrado.');
        this.loading.set(false);
      },
    });

    this.questService.list(0, 50).subscribe({
      next: (page) => this.quests.set(page.content.filter((q) => q.gameId === this.gameId)),
    });

    this.loreService.list(0, 50).subscribe({
      next: (page) => this.loreArticles.set(page.content.filter((l) => l.gameId === this.gameId)),
    });
  }

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
