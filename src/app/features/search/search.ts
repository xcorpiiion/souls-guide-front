import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs';
import { LoreSummary } from '../../shared/models/lore-article.model';
import { QuestSummary } from '../../shared/models/quest.model';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';

@Component({
  selector: 'app-search',
  imports: [RouterLink, LowerCasePipe],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questService = inject(QuestService);
  private readonly loreService = inject(LoreService);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  protected readonly query = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('q') ?? '')), {
    initialValue: '',
  });

  protected readonly loading = signal(false);
  protected readonly questResults = signal<QuestSummary[]>([]);
  protected readonly loreResults = signal<LoreSummary[]>([]);

  protected readonly totalResults = () => this.questResults().length + this.loreResults().length;
  protected readonly hasQuery = () => this.query().trim().length > 0;

  ngOnInit(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) {
            this.questResults.set([]);
            this.loreResults.set([]);
            this.loading.set(false);
            return [];
          }
          this.loading.set(true);
          return this.questService.search(q, 30);
        }),
      )
      .subscribe({
        next: (results) => {
          this.questResults.set(results);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) return [];
          return this.loreService.search(q, 30);
        }),
      )
      .subscribe({
        next: (results) => this.loreResults.set(results),
        error: () => {
          /* silenced */
        },
      });

    const initial = this.query();
    if (initial.trim().length >= 2) {
      this.search$.next(initial);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.complete();
  }

  protected onSearch(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.router.navigate(['/search'], { queryParams: { q }, replaceUrl: true });
    this.search$.next(q);
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
