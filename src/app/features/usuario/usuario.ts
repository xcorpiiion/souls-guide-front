import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { PersonalLoreService } from '../../core/services/personal-lore.service';
import { UserPublicProfile, ActivityEvent } from '../../shared/models/user.model';
import { QuestSummary, QuestStatus } from '../../shared/models/quest.model';
import { LoreSummary } from '../../shared/models/lore-article.model';

type UsuarioTab = 'quests' | 'lore';

@Component({
  selector: 'app-usuario',
  imports: [RouterLink, LowerCasePipe],
  templateUrl: './usuario.html',
  styleUrl: './usuario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Usuario implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly personalQuestService = inject(PersonalQuestService);
  private readonly personalLoreService = inject(PersonalLoreService);

  protected readonly handle = this.route.snapshot.paramMap.get('handle') ?? '';

  protected readonly profile = signal<UserPublicProfile | null>(null);
  protected readonly notFound = signal(false);
  protected readonly loading = signal(true);
  protected readonly activeTab = signal<UsuarioTab>('quests');
  protected readonly following = signal(false);
  protected readonly togglingFollow = signal(false);

  protected readonly quests = signal<QuestSummary[]>([]);
  protected readonly lore = signal<LoreSummary[]>([]);
  protected readonly loadingContent = signal(false);
  protected readonly activity = signal<ActivityEvent[]>([]);

  protected readonly isLoggedIn = computed(() => this.authService.isLoggedIn());

  ngOnInit(): void {
    this.userService.getByHandle(this.handle).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.following.set(data.isFollowing);
        this.loading.set(false);
        this.loadContent(data.id);
        this.userService.getActivity(String(data.id)).subscribe({
          next: (events) => this.activity.set(events),
          error: () => {
            /* silenced */
          },
        });
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadContent(userId: number): void {
    this.loadingContent.set(true);
    this.personalQuestService.listByUser(String(userId)).subscribe({
      next: (list) => this.quests.set(list),
      error: () => {
        /* silenced */
      },
    });
    this.personalLoreService.listByUser(String(userId)).subscribe({
      next: (list) => {
        this.lore.set(list);
        this.loadingContent.set(false);
      },
      error: () => this.loadingContent.set(false),
    });
  }

  protected setTab(tab: UsuarioTab): void {
    this.activeTab.set(tab);
  }

  protected toggleFollow(): void {
    const p = this.profile();
    if (!p || this.togglingFollow()) return;
    this.togglingFollow.set(true);

    if (this.following()) {
      this.userService.unfollow(p.id).subscribe({
        next: () => {
          this.following.set(false);
          this.profile.update((u) => (u ? { ...u, followerCount: u.followerCount - 1 } : u));
          this.togglingFollow.set(false);
        },
        error: () => this.togglingFollow.set(false),
      });
    } else {
      this.userService.follow(p.id).subscribe({
        next: () => {
          this.following.set(true);
          this.profile.update((u) => (u ? { ...u, followerCount: u.followerCount + 1 } : u));
          this.togglingFollow.set(false);
        },
        error: () => this.togglingFollow.set(false),
      });
    }
  }

  protected statusLabel(s: QuestStatus): string {
    return ({ TEORIA: 'teoria', CONSOLIDADO: 'consolidado', CANONICO: 'canônico' } as const)[s];
  }

  protected activityLabel(type: string): string {
    return (
      (
        { created: 'Criou', updated: 'Atualizou', followed_user: 'Começou a seguir' } as Record<
          string,
          string
        >
      )[type] ?? type
    );
  }

  protected activityDot(type: string): string {
    return (
      (
        { created: 'dot--green', updated: 'dot--gold', followed_user: 'dot--blue' } as Record<
          string,
          string
        >
      )[type] ?? 'dot--gray'
    );
  }

  protected daysLabel(d: number): string {
    if (d === 0) return 'hoje';
    if (d === 1) return 'ontem';
    if (d < 7) return `há ${d} dias`;
    return `há ${Math.round(d / 7)} sem`;
  }
}
