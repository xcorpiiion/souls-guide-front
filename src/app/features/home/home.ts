import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoreStatus } from '../../shared/models/lore-article.model';
import { LORE_ARTICLES } from '../lore/lore.mocks';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';
import { GAMES, LORE, QUESTS } from './home.mocks';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, LowerCasePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly router = inject(Router);

  protected readonly games = GAMES;

  protected readonly stats = [
    { value: QUESTS_DETAIL.length, label: 'questlines' },
    { value: LORE_ARTICLES.length, label: 'artigos de lore' },
    { value: GAMES.length, label: 'jogos' },
    { value: 420, label: 'colaboradores' },
  ];

  protected readonly selectedGameId = signal<string | null>(null);
  protected readonly searchTerm = signal('');

  protected readonly filteredQuests = computed(() => {
    const gameId = this.selectedGameId();
    const term = this.searchTerm().toLowerCase().trim();

    return QUESTS.filter((q) => !gameId || q.gameId === gameId)
      .filter((q) => !term || q.title.toLowerCase().includes(term))
      .slice(0, 5);
  });

  protected readonly filteredLore = computed(() => {
    const gameId = this.selectedGameId();
    const term = this.searchTerm().toLowerCase().trim();

    return LORE.filter((l) => !gameId || l.gameId === gameId)
      .filter((l) => !term || l.title.toLowerCase().includes(term))
      .slice(0, 4);
  });

  protected toggleGame(gameId: string): void {
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

  protected throwTestError(): void {
    throw new Error('Sentry Test — pode ignorar este erro');
  }
}
