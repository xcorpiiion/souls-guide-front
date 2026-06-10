import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoreStatus } from '../../shared/models/lore-article.model';
import { GAMES, LORE, QUESTS } from './home.mocks';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, LowerCasePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly games = GAMES;

  protected readonly selectedGameId = signal<string | null>(null);
  protected readonly searchTerm = signal('');

  protected readonly filteredQuests = computed(() => {
    const gameId = this.selectedGameId();
    const term = this.searchTerm().toLowerCase().trim();

    return QUESTS
      .filter((q) => !gameId || q.gameId === gameId)
      .filter((q) => !term || q.title.toLowerCase().includes(term))
      .slice(0, 5);
  });

  protected readonly filteredLore = computed(() => {
    const gameId = this.selectedGameId();
    const term = this.searchTerm().toLowerCase().trim();

    return LORE
      .filter((l) => !gameId || l.gameId === gameId)
      .filter((l) => !term || l.title.toLowerCase().includes(term))
      .slice(0, 4);
  });

  protected toggleGame(gameId: string): void {
    this.selectedGameId.update((id) => (id === gameId ? null : gameId));
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  protected loreBadgeLabel(status: LoreStatus): string {
    const labels: Record<LoreStatus, string> = {
      CANONICO:    'Canônico',
      CONSOLIDADO: 'Consolidado',
      TEORIA:      'Teoria',
    };
    return labels[status];
  }

  protected trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
