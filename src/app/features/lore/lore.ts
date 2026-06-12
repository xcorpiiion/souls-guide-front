import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoreCategory, LoreSummary } from '../../shared/models/lore-article.model';
import { LoreService } from '../../core/services/lore.service';

const GAME_FILTERS = [
  { id: '', label: 'todos' },
  { id: 'elden-ring', label: 'Elden Ring' },
  { id: 'bloodborne', label: 'Bloodborne' },
  { id: 'dark-souls-3', label: 'Dark Souls III' },
  { id: 'lies-of-p', label: 'Lies of P' },
];

const CATEGORY_FILTERS: { id: LoreCategory | ''; label: string }[] = [
  { id: '', label: 'todos' },
  { id: 'NPC', label: 'NPCs' },
  { id: 'LOCACAO', label: 'locações' },
  { id: 'ITEM', label: 'itens' },
  { id: 'EVENTO', label: 'eventos' },
  { id: 'TEORIA', label: 'teoria' },
];

@Component({
  selector: 'app-lore',
  imports: [RouterLink, LowerCasePipe],
  templateUrl: './lore.html',
  styleUrl: './lore.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lore implements OnInit {
  private readonly loreService = inject(LoreService);

  protected readonly gameFilters = GAME_FILTERS;
  protected readonly categoryFilters = CATEGORY_FILTERS;

  protected readonly loading = signal(true);
  protected readonly skeletonItems = Array.from({ length: 6 });
  protected readonly error = signal<string | null>(null);

  protected readonly articles = signal<LoreSummary[]>([]);
  protected readonly search = signal('');
  protected readonly gameFilter = signal('');
  protected readonly categoryFilter = signal<LoreCategory | ''>('');

  ngOnInit(): void {
    this.loreService.list(0, 50).subscribe({
      next: (page) => {
        this.articles.set(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o lore.');
        this.loading.set(false);
      },
    });
  }

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const game = this.gameFilter();
    const cat = this.categoryFilter();
    return this.articles().filter(
      (a) =>
        (!game || a.gameId === game) &&
        (!cat || a.category === cat) &&
        (!q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)),
    );
  });

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
