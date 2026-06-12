import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LoreArticle } from '../../shared/models/lore-article.model';
import { QuestDetailData } from '../../shared/models/quest.model';
import { LORE_ARTICLES } from '../lore/lore.mocks';
import { QUESTS_DETAIL } from '../quest-detail/quest-detail.mocks';

@Component({
  selector: 'app-search',
  imports: [RouterLink, LowerCasePipe],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly query = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('q') ?? '')), {
    initialValue: '',
  });

  protected readonly questResults = computed<QuestDetailData[]>(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return [];
    return QUESTS_DETAIL.filter(
      (quest) =>
        quest.title.toLowerCase().includes(q) ||
        (quest.description ?? '').toLowerCase().includes(q) ||
        quest.gameName.toLowerCase().includes(q),
    );
  });

  protected readonly loreResults = computed<LoreArticle[]>(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return [];
    return LORE_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.gameName.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)),
    );
  });

  protected readonly totalResults = computed(
    () => this.questResults().length + this.loreResults().length,
  );

  protected readonly hasQuery = computed(() => this.query().trim().length > 0);

  protected onSearch(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.router.navigate(['/search'], { queryParams: { q }, replaceUrl: true });
  }

  protected statusLabel(s: string): string {
    const map: Record<string, string> = {
      TEORIA: 'teoria',
      CONSOLIDADO: 'consolidado',
      CANONICO: 'canônico',
    };
    return map[s] ?? s;
  }

  protected categoryLabel(c: string): string {
    const map: Record<string, string> = {
      NPC: 'NPC',
      LOCACAO: 'locação',
      ITEM: 'item',
      EVENTO: 'evento',
      TEORIA: 'teoria',
    };
    return map[c] ?? c;
  }
}
