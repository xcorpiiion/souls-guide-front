import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { QuestStatus, QuestSummary } from '../../shared/models/quest.model';
import { LoreSummary } from '../../shared/models/lore-article.model';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { PersonalLoreService } from '../../core/services/personal-lore.service';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { MY_PROFILE, UserProfile } from './profile.mocks';
import { GameFilterDropdown } from '../../shared/components/game-filter-dropdown/game-filter-dropdown';
import { UserSummary } from '../../shared/models/user.model';
import { GameSummary } from '../../shared/models/game.model';

type ProfileTab = 'quests' | 'lore' | 'seguindo' | 'favoritos' | 'jogos' | 'seguidores';
type SocialSubTab = 'me-seguem' | 'sigo';
type SeguindoSubTab = 'quests' | 'lore';
type QuestSubTab = 'minhas' | 'seguidas';
type LoreSubTab = 'meu' | 'seguido';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, LowerCasePipe, ReactiveFormsModule, GameFilterDropdown],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly personalQuestService = inject(PersonalQuestService);
  private readonly personalLoreService = inject(PersonalLoreService);
  private readonly questService = inject(QuestService);
  private readonly loreService = inject(LoreService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  protected readonly profile = signal<UserProfile>(MY_PROFILE);
  /** ID do usuário na users-api (auth) — usado para update de perfil e senha */
  protected readonly userId = signal<number | null>(null);
  /** ID do usuário na souls-guide-api — usado para buscar quests, lore, seguidores */
  private readonly sgUserId = signal<number | null>(null);

  protected readonly isGoogleUser = signal(false);
  protected readonly activeTab = signal<ProfileTab>('quests');
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly successMsg = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordSuccess = signal<string | null>(null);

  protected readonly personalQuests = signal<QuestSummary[]>([]);
  protected readonly personalLore = signal<LoreSummary[]>([]);
  protected readonly loadingContent = signal(false);
  protected readonly deletingQuestId = signal<string | null>(null);
  protected readonly deletingLoreId = signal<string | null>(null);
  protected readonly togglingVisibilityId = signal<string | null>(null);
  protected readonly togglingCopyId = signal<string | null>(null);

  protected readonly infoForm = this.fb.group({
    name: ['', Validators.required],
    nickname: ['', Validators.required],
    bio: [''],
    location: [''],
    website: [''],
  });

  protected readonly passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  protected readonly followedQuests = signal<QuestSummary[]>([]);
  protected readonly followedLore = signal<LoreSummary[]>([]);
  protected readonly likedQuests = signal<QuestSummary[]>([]);
  protected readonly likedLore = signal<LoreSummary[]>([]);
  protected readonly loadingFollowed = signal(false);
  protected readonly loadingFavorites = signal(false);
  private followedLoaded = false;
  private favoritesLoaded = false;

  protected readonly questSubTab = signal<QuestSubTab>('minhas');
  protected readonly loreSubTab = signal<LoreSubTab>('meu');
  protected readonly questSearch = signal('');
  protected readonly loreSearch = signal('');
  protected readonly gameSearch = signal('');
  protected readonly questGameFilter = signal('');
  protected readonly loreGameFilter = signal('');

  private filterList<T extends { title: string; gameName?: string }>(
    list: T[],
    text: string,
    game: string,
  ): T[] {
    const t = text.toLowerCase().trim();
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

  protected readonly filteredPersonalQuests = computed(() =>
    this.filterList(this.personalQuests(), this.questSearch(), this.questGameFilter()),
  );
  protected readonly personalQuestGames = computed(() => this.uniqueGames(this.personalQuests()));

  protected readonly filteredPersonalLore = computed(() =>
    this.filterList(this.personalLore(), this.loreSearch(), this.loreGameFilter()),
  );
  protected readonly personalLoreGames = computed(() => this.uniqueGames(this.personalLore()));

  protected readonly filteredFollowedQuests = computed(() =>
    this.filterList(this.followedQuests(), this.questSearch(), this.questGameFilter()),
  );
  protected readonly followedQuestGames = computed(() => this.uniqueGames(this.followedQuests()));

  protected readonly filteredFollowedLore = computed(() =>
    this.filterList(this.followedLore(), this.loreSearch(), this.loreGameFilter()),
  );
  protected readonly followedLoreGames = computed(() => this.uniqueGames(this.followedLore()));

  protected readonly followingGames = signal<GameSummary[]>([]);
  protected readonly filteredGames = computed(() => {
    const q = this.gameSearch().toLowerCase().trim();
    return q
      ? this.followingGames().filter((g) => g.name.toLowerCase().includes(q))
      : this.followingGames();
  });
  private gamesLoaded = false;

  protected readonly socialSubTab = signal<SocialSubTab>('me-seguem');
  protected readonly seguindoSubTab = signal<SeguindoSubTab>('quests');
  protected readonly followers = signal<UserSummary[]>([]);
  protected readonly followingPeople = signal<UserSummary[]>([]);
  protected readonly loadingSocial = signal(false);
  private socialLoaded = false;

  ngOnInit(): void {
    this.isGoogleUser.set(this.authService.isGoogleUser());

    const email = this.authService.getEmail();
    if (!email) return;

    // Passo 1: busca dados de auth (nome, nickname, formulário)
    this.profileService.getByEmail(email).subscribe({
      next: (data) => {
        this.userId.set(data.id);
        this.profile.update((p) => ({
          ...p,
          name: data.name,
          handle: data.nickname,
          bio: data.bio ?? p.bio,
          joinedLabel:
            data.joinedLabel ??
            (data.createdAt ? this.formatJoinedLabel(data.createdAt) : p.joinedLabel),
        }));
        this.infoForm.patchValue({
          name: data.name,
          nickname: data.nickname,
          bio: data.bio ?? '',
          location: data.location ?? '',
          website: data.website ?? '',
        });

        // Passo 2: busca stats reais e id da souls-guide-api
        this.userService.getByHandle(data.nickname).subscribe({
          next: (pub) => {
            this.sgUserId.set(pub.id);
            this.profile.update((p) => ({
              ...p,
              questCount: pub.questCount,
              followers: pub.followerCount,
              following: pub.followingCount,
            }));

            // Passo 3: busca quests, lore e jogos seguidos em paralelo
            this.loadPersonalContent(pub.id);

            this.userService.getFollowingGames(pub.id).subscribe({
              next: (games) => {
                this.followingGames.set(games);
                this.gamesLoaded = true;
                this.profile.update((p) => ({
                  ...p,
                  favoriteGames: games.map((g) => ({
                    id: String(g.id),
                    name: g.name,
                    icon: 'ti-sword',
                    questCount: g.questCount,
                  })),
                }));
              },
              error: () => {
                /* silenced — sidebar fica sem jogos */
              },
            });

            this.userService.getActivity(String(pub.id)).subscribe({
              next: (events) => {
                this.profile.update((p) => ({
                  ...p,
                  activity: events.map((e) => ({
                    type: e.type === 'followed_user' ? 'followed' : e.type,
                    target:
                      e.type === 'followed_user'
                        ? e.targetTitle?.startsWith('@')
                          ? e.targetTitle
                          : `usuário #${e.targetId}`
                        : (e.targetTitle ?? ''),
                    questId: e.targetKind === 'quest' ? e.targetId : undefined,
                    daysAgo: e.daysAgo,
                  })),
                }));
              },
              error: () => {
                /* silenced — activity is non-critical */
              },
            });
          },
          error: () => {
            /* silenced — stats ficam com os valores do mock */
          },
        });
      },
      error: () => {
        const p = this.profile();
        this.infoForm.patchValue({ name: p.name, nickname: p.handle, bio: p.bio });
      },
    });
  }

  private loadPersonalContent(userId: number): void {
    this.loadingContent.set(true);
    forkJoin([
      this.profileService.getQuestsByUser(userId),
      this.profileService.getLoreByUser(userId),
    ]).subscribe({
      next: ([quests, lore]) => {
        this.personalQuests.set(quests);
        this.personalLore.set(lore);
        this.updateGameCount(quests, lore);
        this.loadingContent.set(false);
      },
      error: () => this.loadingContent.set(false),
    });
  }

  private updateGameCount(quests: QuestSummary[], lore: LoreSummary[]): void {
    const gameIds = new Set([...quests.map((q) => q.gameId), ...lore.map((l) => l.gameId)]);
    this.profile.update((p) => ({ ...p, gameCount: gameIds.size }));
  }

  private formatJoinedLabel(iso: string): string {
    const d = new Date(iso);
    return d
      .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      .replace('.', '')
      .toLowerCase();
  }

  protected toggleQuestVisibility(quest: QuestSummary): void {
    if (this.togglingVisibilityId()) return;
    const makePublic = !quest.isPublic;
    this.confirm
      .ask({
        title: makePublic ? 'Tornar quest pública' : 'Tornar quest privada',
        message: makePublic
          ? 'Outros usuários poderão ver esta quest no seu perfil.'
          : 'A quest ficará visível apenas para você.',
        confirmLabel: makePublic ? 'tornar pública' : 'tornar privada',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.togglingVisibilityId.set(quest.id);
        this.personalQuestService.updatePersonal(quest.id, { isPublic: makePublic }).subscribe({
          next: () => {
            this.personalQuests.update((list) =>
              list.map((q) => (q.id === quest.id ? { ...q, isPublic: makePublic } : q)),
            );
            this.togglingVisibilityId.set(null);
          },
          error: () => {
            this.toast.error('Erro', 'Não foi possível alterar a visibilidade.');
            this.togglingVisibilityId.set(null);
          },
        });
      });
  }

  protected toggleQuestCopy(quest: QuestSummary): void {
    if (this.togglingCopyId()) return;
    const allowCopy = !quest.allowCopy;
    this.confirm
      .ask({
        title: allowCopy ? 'Permitir cópia' : 'Desabilitar cópia',
        message: allowCopy
          ? 'Outros usuários poderão copiar esta quest para o perfil deles.'
          : 'Ninguém mais poderá copiar esta quest.',
        confirmLabel: allowCopy ? 'permitir cópia' : 'desabilitar cópia',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.togglingCopyId.set(quest.id);
        this.personalQuestService.updatePersonal(quest.id, { allowCopy }).subscribe({
          next: () => {
            this.personalQuests.update((list) =>
              list.map((q) => (q.id === quest.id ? { ...q, allowCopy } : q)),
            );
            this.togglingCopyId.set(null);
          },
          error: () => {
            this.toast.error('Erro', 'Não foi possível alterar a permissão de cópia.');
            this.togglingCopyId.set(null);
          },
        });
      });
  }

  protected deletePersonalQuest(id: string): void {
    this.confirm
      .ask({
        title: 'Excluir quest',
        message:
          'Esta ação não pode ser desfeita. A quest será removida permanentemente do seu perfil.',
        confirmLabel: 'excluir',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.deletingQuestId.set(id);
        this.personalQuestService.deletePersonal(id).subscribe({
          next: () => {
            this.personalQuests.update((list) => list.filter((q) => q.id !== id));
            this.deletingQuestId.set(null);
            this.toast.success('Quest excluída', 'A quest foi removida do seu perfil.');
          },
          error: () => {
            this.deletingQuestId.set(null);
            this.toast.error('Erro', 'Não foi possível excluir a quest.');
          },
        });
      });
  }

  protected deletePersonalLore(id: string): void {
    this.deletingLoreId.set(id);
    this.personalLoreService.deletePersonal(id).subscribe({
      next: () => {
        this.personalLore.update((list) => list.filter((l) => l.id !== id));
        this.deletingLoreId.set(null);
        this.toast.success('Lore excluído', 'O artigo foi removido do seu perfil.');
      },
      error: () => {
        this.deletingLoreId.set(null);
        this.toast.error('Erro', 'Não foi possível excluir o lore.');
      },
    });
  }

  private ensureFollowedLoaded(): void {
    if (this.followedLoaded) return;
    this.followedLoaded = true;
    this.loadingFollowed.set(true);
    this.questService.listFollowed().subscribe({
      next: (list) => this.followedQuests.set(list),
      error: () => {
        /* silenced */
      },
    });
    this.loreService.listFollowed().subscribe({
      next: (list) => {
        this.followedLore.set(list);
        this.loadingFollowed.set(false);
      },
      error: () => this.loadingFollowed.set(false),
    });
  }

  protected setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);

    if (tab === 'seguindo') this.ensureFollowedLoaded();

    if (tab === 'seguidores' && !this.socialLoaded) {
      const id = this.sgUserId();
      if (id === null) return;
      this.socialLoaded = true;
      this.loadingSocial.set(true);
      this.userService.getFollowers(id).subscribe({
        next: (list) => this.followers.set(list),
        error: () => {
          /* silenced */
        },
      });
      this.userService.getFollowing(id).subscribe({
        next: (list) => {
          this.followingPeople.set(list);
          this.loadingSocial.set(false);
        },
        error: () => this.loadingSocial.set(false),
      });
    }

    if (tab === 'jogos' && !this.gamesLoaded) {
      const id = this.sgUserId();
      if (id === null) return;
      this.gamesLoaded = true;
      this.userService.getFollowingGames(id).subscribe({
        next: (games) => this.followingGames.set(games),
        error: () => {
          /* silenced */
        },
      });
    }

    if (tab === 'favoritos' && !this.favoritesLoaded) {
      this.favoritesLoaded = true;
      this.loadingFavorites.set(true);
      this.questService.listLiked().subscribe({
        next: (list) => this.likedQuests.set(list),
        error: () => {
          /* silenced */
        },
      });
      this.loreService.listLiked().subscribe({
        next: (list) => {
          this.likedLore.set(list);
          this.loadingFavorites.set(false);
        },
        error: () => this.loadingFavorites.set(false),
      });
    }
  }

  protected setSeguindoSubTab(sub: SeguindoSubTab): void {
    this.seguindoSubTab.set(sub);
    if (sub === 'quests') this.questGameFilter.set('');
    else this.loreGameFilter.set('');
  }

  protected setQuestSubTab(sub: QuestSubTab): void {
    this.questSubTab.set(sub);
    this.questGameFilter.set('');
    if (sub === 'seguidas') this.ensureFollowedLoaded();
  }

  protected setLoreSubTab(sub: LoreSubTab): void {
    this.loreSubTab.set(sub);
    this.loreGameFilter.set('');
    if (sub === 'seguido') this.ensureFollowedLoaded();
  }

  protected startEditing(): void {
    this.editing.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }

  protected cancelEditing(): void {
    this.editing.set(false);
    this.errorMsg.set(null);
    this.passwordError.set(null);
    this.passwordForm.reset();
  }

  protected saveProfile(): void {
    const id = this.userId();
    if (this.infoForm.invalid || id === null) return;
    this.saving.set(true);
    this.errorMsg.set(null);

    const v = this.infoForm.value;
    this.profileService
      .updateProfile(id, {
        name: v.name!,
        nickname: v.nickname!,
        bio: v.bio ?? null,
        location: v.location ?? null,
        website: v.website ?? null,
      })
      .subscribe({
        next: (data) => {
          this.profile.update((p) => ({
            ...p,
            name: data.name,
            handle: data.nickname,
            bio: data.bio ?? p.bio,
          }));
          this.saving.set(false);
          this.successMsg.set('Perfil atualizado com sucesso!');
          setTimeout(() => {
            this.successMsg.set(null);
            this.editing.set(false);
          }, 1500);
        },
        error: () => {
          this.errorMsg.set('Não foi possível salvar as alterações.');
          this.saving.set(false);
        },
      });
  }

  protected savePassword(): void {
    const id = this.userId();
    const v = this.passwordForm.value;
    if (this.passwordForm.invalid || id === null) return;
    if (v.newPassword !== v.confirmPassword) {
      this.passwordError.set('As senhas não coincidem.');
      return;
    }
    this.savingPassword.set(true);
    this.passwordError.set(null);

    this.profileService
      .changePassword(id, { currentPassword: v.currentPassword!, newPassword: v.newPassword! })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.passwordSuccess.set('Senha atualizada!');
          this.passwordForm.reset();
          setTimeout(() => this.passwordSuccess.set(null), 2500);
        },
        error: () => {
          this.passwordError.set('Senha atual incorreta.');
          this.savingPassword.set(false);
        },
      });
  }

  protected statusLabel(s: QuestStatus): string {
    return ({ TEORIA: 'teoria', CONSOLIDADO: 'consolidado', CANONICO: 'canônico' } as const)[s];
  }

  protected activityLabel(type: string): string {
    return (
      (
        {
          created: 'Criou',
          updated: 'Atualizou',
          followed: 'Começou a seguir',
          followed_user: 'Começou a seguir',
        } as Record<string, string>
      )[type] ?? type
    );
  }

  protected activityDot(type: string): string {
    return (
      (
        { created: 'dot--green', updated: 'dot--gold', followed: 'dot--blue' } as Record<
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
