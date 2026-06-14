import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuestStatus, QuestSummary } from '../../shared/models/quest.model';
import { LoreSummary } from '../../shared/models/lore-article.model';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { PersonalLoreService } from '../../core/services/personal-lore.service';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { MY_PROFILE, UserProfile } from './profile.mocks';

type ProfileTab = 'quests' | 'lore' | 'seguindo' | 'favoritos';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, LowerCasePipe, ReactiveFormsModule],
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
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly profile = signal<UserProfile>(MY_PROFILE);
  protected readonly userId = signal<number | null>(null);
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

  ngOnInit(): void {
    this.isGoogleUser.set(this.authService.isGoogleUser());

    const email = this.authService.getEmail();
    if (!email) return;

    this.profileService.getByEmail(email).subscribe({
      next: (data) => {
        this.userId.set(data.id);
        this.profile.update((p) => ({
          ...p,
          name: data.name,
          handle: data.nickname,
          bio: data.bio ?? p.bio,
        }));
        this.infoForm.patchValue({
          name: data.name,
          nickname: data.nickname,
          bio: data.bio ?? '',
          location: data.location ?? '',
          website: data.website ?? '',
        });
        this.loadPersonalContent(String(data.id));
      },
      error: () => {
        const p = this.profile();
        this.infoForm.patchValue({
          name: p.name,
          nickname: p.handle,
          bio: p.bio,
        });
      },
    });
  }

  private loadPersonalContent(userId: string): void {
    this.loadingContent.set(true);
    this.personalQuestService.listByUser(userId).subscribe({
      next: (list) => this.personalQuests.set(list),
      error: () => {
        /* silenced */
      },
    });
    this.personalLoreService.listByUser(userId).subscribe({
      next: (list) => {
        this.personalLore.set(list);
        this.loadingContent.set(false);
      },
      error: () => this.loadingContent.set(false),
    });
  }

  protected deletePersonalQuest(id: string): void {
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

  protected setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    if (tab === 'seguindo' && !this.followedLoaded) {
      this.followedLoaded = true;
      this.loadingFollowed.set(true);
      this.questService.listFollowed().subscribe({
        next: (list) => this.followedQuests.set(list),
        error: () => {
          /* silenced — backend pendente */
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
    if (tab === 'favoritos' && !this.favoritesLoaded) {
      this.favoritesLoaded = true;
      this.loadingFavorites.set(true);
      this.questService.listLiked().subscribe({
        next: (list) => this.likedQuests.set(list),
        error: () => {
          /* silenced — backend pendente */
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
        { created: 'Criou', updated: 'Atualizou', followed: 'Começou a seguir' } as Record<
          string,
          string
        >
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
