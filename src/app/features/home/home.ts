import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LoreSummary, LoreStatus } from '../../shared/models/lore-article.model';
import { QuestSummary } from '../../shared/models/quest.model';
import { FeaturedGame } from '../../shared/models/game.model';
import { GameService } from '../../core/services/game.service';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, LowerCasePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);
  private readonly questService = inject(QuestService);
  private readonly loreService = inject(LoreService);

  protected readonly games = signal<FeaturedGame[]>([]);
  protected readonly quests = signal<QuestSummary[]>([]);
  protected readonly lore = signal<LoreSummary[]>([]);

  protected readonly totalQuests = signal(0);
  protected readonly totalLore = signal(0);
  protected readonly totalGames = signal(0);

  protected readonly stats = computed(() => [
    { value: this.totalQuests(), label: 'questlines' },
    { value: this.totalLore(), label: 'artigos de lore' },
    { value: this.totalGames(), label: 'jogos' },
  ]);

  protected readonly selectedGameId = signal<number | null>(null);
  protected readonly searchTerm = signal('');

  protected readonly filteredQuests = computed(() => {
    const gameId = this.selectedGameId();
    const term = this.searchTerm().toLowerCase().trim();
    return this.quests()
      .filter((q) => !gameId || q.gameId === String(gameId))
      .filter((q) => !term || q.title.toLowerCase().includes(term))
      .slice(0, 5);
  });

  protected readonly filteredLore = computed(() => {
    const gameId = this.selectedGameId();
    const term = this.searchTerm().toLowerCase().trim();
    return this.lore()
      .filter((l) => !gameId || l.gameId === String(gameId))
      .filter((l) => !term || l.title.toLowerCase().includes(term))
      .slice(0, 4);
  });

  ngOnInit(): void {
    forkJoin({
      games: this.gameService.getFeatured(),
      gamesTotal: this.gameService.list(0, 1),
      quests: this.questService.list(0, 20),
      lore: this.loreService.list(0, 12),
    }).subscribe({
      next: ({ games, gamesTotal, quests, lore }) => {
        this.games.set(games);
        this.totalGames.set(gamesTotal.totalElements ?? gamesTotal.content.length);
        this.quests.set(quests.content);
        this.totalQuests.set(quests.totalElements ?? quests.content.length);
        this.lore.set(lore.content);
        this.totalLore.set(lore.totalElements ?? lore.content.length);
      },
      error: () => {
        /* silenced */
      },
    });
  }

  protected toggleGame(gameId: number): void {
    this.selectedGameId.update((id) => (id === gameId ? null : gameId));
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  protected submitSearch(): void {
    const q = this.searchTerm().trim();
    if (q) this.router.navigate(['/search'], { queryParams: { q } });
  }

  protected loreBadgeLabel(status: LoreStatus): string {
    const labels: Record<LoreStatus, string> = {
      CANONICO: 'Canônico',
      CONSOLIDADO: 'Consolidado',
      TEORIA: 'Teoria',
    };
    return labels[status];
  }

  protected trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
