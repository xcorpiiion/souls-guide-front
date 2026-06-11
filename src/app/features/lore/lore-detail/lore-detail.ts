import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LoreCategory } from '../../../shared/models/lore-article.model';
import { LORE_ARTICLES } from '../lore.mocks';

@Component({
  selector: 'app-lore-detail',
  imports: [RouterLink, LowerCasePipe],
  templateUrl: './lore-detail.html',
  styleUrl: './lore-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreDetail {
  private readonly route = inject(ActivatedRoute);

  private readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')));

  protected readonly article = computed(() => LORE_ARTICLES.find((a) => a.id === this.id()));

  protected categoryLabel(cat: LoreCategory): string {
    const map: Record<LoreCategory, string> = {
      NPC: 'NPC',
      LOCACAO: 'locação',
      ITEM: 'item',
      EVENTO: 'evento',
      TEORIA: 'teoria',
    };
    return map[cat];
  }

  protected statusLabel(s: string): string {
    const map: Record<string, string> = {
      TEORIA: 'teoria',
      CONSOLIDADO: 'consolidado',
      CANONICO: 'canônico',
    };
    return map[s];
  }
}
