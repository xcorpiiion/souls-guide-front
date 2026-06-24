import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { filter, switchMap } from 'rxjs/operators';
import { Game, gameToSummary, GameSummary } from '../../shared/models/game.model';
import { QuestStatus, QuestSummary } from '../../shared/models/quest.model';
import { LoreSummary } from '../../shared/models/lore-article.model';
import { GameService } from '../../core/services/game.service';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';
import { AuthService } from '../../core/services/auth.service';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { PageLoader } from '../../shared/components/page-loader/page-loader';

type Tab = 'quests' | 'lore' | 'contributors';
type QuestFilter = QuestStatus | 'todos';

interface FilterOption {
  value: QuestFilter;
  label: string;
}

@Component({
  selector: 'app-game-detail',
  imports: [RouterLink, PageLoader],
  templateUrl: './game-detail.html',
  styleUrl: './game-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly gameService = inject(GameService);
  private readonly questService = inject(QuestService);
  private readonly loreService = inject(LoreService);
  private readonly personalQuestService = inject(PersonalQuestService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly el = inject(ElementRef);
  readonly auth = inject(AuthService);

  private readonly gameId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly game = signal<GameSummary | null>(null);
  protected readonly gameFollowing = signal(false);
  protected readonly togglingFollow = signal(false);
  protected readonly quests = signal<QuestSummary[]>([]);
  protected readonly loreArticles = signal<LoreSummary[]>([]);

  protected readonly activeTab = signal<Tab>('quests');
  protected readonly activeFilter = signal<QuestFilter>('todos');
  protected readonly showHidden = signal(false);
  protected readonly showContribMenu = signal(false);
  protected readonly copyingAll = signal(false);

  protected readonly filters: FilterOption[] = [
    { value: 'todos', label: 'todos' },
    { value: 'CANONICO', label: 'canônico' },
    { value: 'CONSOLIDADO', label: 'consolidado' },
    { value: 'TEORIA', label: 'teoria' },
  ];

  protected readonly hiddenCount = computed(() => this.quests().filter((q) => q.hidden).length);

  protected readonly copyableQuests = computed(() =>
    this.quests().filter((q) => !q.isOwner && !q.isPersonal),
  );

  protected readonly filteredQuests = computed(() => {
    const filter = this.activeFilter();
    const byStatus =
      filter === 'todos' ? this.quests() : this.quests().filter((q) => q.status === filter);
    return this.showHidden() ? byStatus : byStatus.filter((q) => !q.hidden);
  });

  ngOnInit(): void {
    this.gameService.get(this.gameId).subscribe({
      next: (g: Game) => {
        this.game.set(gameToSummary(g));
        this.gameFollowing.set(g.userIsFollowing ?? false);
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

  protected readonly revealedHiddenIds = signal<Set<string>>(new Set());

  protected toggleShowHidden(): void {
    this.showHidden.update((v) => !v);
  }

  protected revealHiddenReason(id: string): void {
    this.revealedHiddenIds.update((s) => new Set([...s, id]));
  }

  protected isHiddenReasonRevealed(quest: QuestSummary): boolean {
    return !quest.hiddenIsSpoiler || this.revealedHiddenIds().has(quest.id);
  }

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  protected toggleFollow(): void {
    if (this.togglingFollow()) return;
    this.togglingFollow.set(true);

    const call = this.gameFollowing()
      ? this.gameService.unfollowGame(this.gameId)
      : this.gameService.followGame(this.gameId);

    const delta = this.gameFollowing() ? -1 : 1;

    call.subscribe({
      next: () => {
        this.gameFollowing.update((v) => !v);
        this.game.update((g) => (g ? { ...g, followersCount: g.followersCount + delta } : g));
        this.togglingFollow.set(false);
      },
      error: () => this.togglingFollow.set(false),
    });
  }

  protected setFilter(filter: QuestFilter): void {
    this.activeFilter.set(filter);
  }

  protected toggleContribMenu(): void {
    this.showContribMenu.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(e: MouseEvent): void {
    if (!this.showContribMenu()) return;
    const host = this.el.nativeElement as HTMLElement;
    if (!host.contains(e.target as Node)) {
      this.showContribMenu.set(false);
    }
  }

  protected copyAll(): void {
    if (!this.copyableQuests().length || this.copyingAll()) return;

    this.confirm
      .ask({
        title: 'Copiar todas as quests',
        message: `Deseja copiar ${this.copyableQuests().length} quest(s) deste jogo para o seu perfil?`,
        confirmLabel: 'copiar todas',
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => {
          this.copyingAll.set(true);
          return this.personalQuestService.copyAllFromGame(this.gameId);
        }),
      )
      .subscribe({
        next: ({ copied, skipped }) => {
          this.copyingAll.set(false);
          if (copied > 0) {
            this.toast.success(
              'Quests copiadas',
              `${copied} quest(s) copiada(s) para o seu perfil.${skipped ? ` ${skipped} já existia(m).` : ''}`,
            );
          } else {
            this.toast.info('Nada novo', 'Todas as quests já estavam no seu perfil.');
          }
        },
        error: () => {
          this.copyingAll.set(false);
          this.toast.error('Erro', 'Não foi possível copiar as quests.');
        },
      });
  }

  protected trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
