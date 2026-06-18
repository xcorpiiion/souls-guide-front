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
import { GameFilterDropdown } from '../../shared/components/game-filter-dropdown/game-filter-dropdown';
import { forkJoin } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { UserPublicProfile, ActivityEvent, UserSummary } from '../../shared/models/user.model';
import { QuestSummary, QuestStatus } from '../../shared/models/quest.model';
import { LoreSummary } from '../../shared/models/lore-article.model';
import { GameSummary } from '../../shared/models/game.model';

type UsuarioTab = 'quests' | 'lore' | 'jogos' | 'seguidores';
type QuestSubTab = 'do-usuario' | 'seguidas';
type LoreSubTab = 'do-usuario' | 'seguido';
type SocialSubTab = 'seguidores' | 'seguindo';

@Component({
  selector: 'app-usuario',
  imports: [RouterLink, LowerCasePipe, GameFilterDropdown],
  templateUrl: './usuario.html',
  styleUrl: './usuario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Usuario implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);

  protected readonly handle = this.route.snapshot.paramMap.get('handle') ?? '';

  protected readonly profile = signal<UserPublicProfile | null>(null);
  protected readonly notFound = signal(false);
  protected readonly loading = signal(true);
  protected readonly activeTab = signal<UsuarioTab>('quests');
  protected readonly questSubTab = signal<QuestSubTab>('do-usuario');
  protected readonly loreSubTab = signal<LoreSubTab>('do-usuario');
  protected readonly socialSubTab = signal<SocialSubTab>('seguidores');
  protected readonly following = signal(false);
  protected readonly togglingFollow = signal(false);

  protected readonly quests = signal<QuestSummary[]>([]);
  protected readonly lore = signal<LoreSummary[]>([]);
  protected readonly loadingContent = signal(false);
  protected readonly activity = signal<ActivityEvent[]>([]);

  protected readonly questSearch = signal('');
  protected readonly loreSearch = signal('');
  protected readonly questGameFilter = signal('');
  protected readonly loreGameFilter = signal('');

  private filterList<T extends { title: string; gameName?: string }>(
    list: T[],
    text: string,
    game: string,
  ): T[] {
    const t = text.toLowerCase();
    const g = game.toLowerCase();
    return list.filter(
      (x) =>
        (!t || x.title.toLowerCase().includes(t) || x.gameName?.toLowerCase().includes(t)) &&
        (!g || x.gameName?.toLowerCase() === g),
    );
  }

  private uniqueGames<T extends { gameName?: string }>(list: T[]): string[] {
    return [...new Set(list.map((x) => x.gameName ?? '').filter(Boolean))].sort();
  }

  protected readonly filteredQuests = computed(() =>
    this.filterList(this.quests(), this.questSearch(), this.questGameFilter()),
  );
  protected readonly questGames = computed(() => this.uniqueGames(this.quests()));

  protected readonly filteredLore = computed(() =>
    this.filterList(this.lore(), this.loreSearch(), this.loreGameFilter()),
  );
  protected readonly loreGames = computed(() => this.uniqueGames(this.lore()));

  protected readonly followers = signal<UserSummary[]>([]);
  protected readonly followingPeople = signal<UserSummary[]>([]);
  protected readonly loadingSocial = signal(false);
  private socialLoaded = false;

  protected readonly followingQuests = signal<QuestSummary[]>([]);
  protected readonly followingLore = signal<LoreSummary[]>([]);
  protected readonly followingGames = signal<GameSummary[]>([]);
  protected readonly loadingFollowed = signal(false);
  private followedLoaded = false;

  protected readonly filteredFollowingQuests = computed(() =>
    this.filterList(this.followingQuests(), this.questSearch(), this.questGameFilter()),
  );
  protected readonly followingQuestGames = computed(() => this.uniqueGames(this.followingQuests()));

  protected readonly filteredFollowingLore = computed(() =>
    this.filterList(this.followingLore(), this.loreSearch(), this.loreGameFilter()),
  );
  protected readonly followingLoreGames = computed(() => this.uniqueGames(this.followingLore()));

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
    forkJoin([
      this.profileService.getQuestsByUser(userId),
      this.profileService.getLoreByUser(userId),
    ]).subscribe({
      next: ([quests, lore]) => {
        this.quests.set(quests);
        this.lore.set(lore);
        this.loadingContent.set(false);
      },
      error: () => this.loadingContent.set(false),
    });
  }

  private loadFollowed(): void {
    if (this.followedLoaded) return;
    const id = this.profile()?.id;
    if (id == null) return;
    this.followedLoaded = true;
    this.loadingFollowed.set(true);
    forkJoin([
      this.userService.getFollowingQuests(id),
      this.userService.getFollowingLore(id),
      this.userService.getFollowingGames(id),
    ]).subscribe({
      next: ([quests, lore, games]) => {
        this.followingQuests.set(quests);
        this.followingLore.set(lore);
        this.followingGames.set(games);
        this.loadingFollowed.set(false);
      },
      error: () => this.loadingFollowed.set(false),
    });
  }

  private loadSocial(): void {
    if (this.socialLoaded) return;
    const id = this.profile()?.id;
    if (id == null) return;
    this.socialLoaded = true;
    this.loadingSocial.set(true);
    forkJoin([this.userService.getFollowers(id), this.userService.getFollowing(id)]).subscribe({
      next: ([followers, following]) => {
        this.followers.set(followers);
        this.followingPeople.set(following);
        this.loadingSocial.set(false);
      },
      error: () => this.loadingSocial.set(false),
    });
  }

  protected setTab(tab: UsuarioTab): void {
    this.activeTab.set(tab);
    if (tab === 'seguidores') this.loadSocial();
    if (tab === 'jogos') this.loadFollowed();
  }

  protected setQuestSubTab(sub: QuestSubTab): void {
    this.questSubTab.set(sub);
    this.questGameFilter.set('');
    if (sub === 'seguidas') this.loadFollowed();
  }

  protected setLoreSubTab(sub: LoreSubTab): void {
    this.loreSubTab.set(sub);
    this.loreGameFilter.set('');
    if (sub === 'seguido') this.loadFollowed();
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

  protected activityTarget(item: ActivityEvent): string | null {
    if (!item.targetTitle) return null;
    if (item.type === 'followed_user') {
      return item.targetTitle.startsWith('@') ? item.targetTitle : `usuário #${item.targetId}`;
    }
    return item.targetTitle;
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
