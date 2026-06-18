import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoreApi, LoreCategory } from '../../../shared/models/lore-article.model';
import { LoreService } from '../../../core/services/lore.service';
import { PersonalLoreService } from '../../../core/services/personal-lore.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  CopyToProfileModal,
  CopyConfirmEvent,
} from '../../../shared/components/copy-to-profile-modal/copy-to-profile-modal';
import { CommentSection } from '../../../shared/components/comment-section/comment-section';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { PageLoader } from '../../../shared/components/page-loader/page-loader';

@Component({
  selector: 'app-lore-detail',
  imports: [RouterLink, LowerCasePipe, CopyToProfileModal, CommentSection, PageLoader],
  templateUrl: './lore-detail.html',
  styleUrl: './lore-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loreService = inject(LoreService);
  private readonly personalLoreService = inject(PersonalLoreService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly article = signal<LoreApi | null>(null);

  protected readonly showCopyModal = signal(false);
  protected readonly copyConflictId = signal<number | undefined>(undefined);
  protected readonly copying = signal(false);

  protected readonly likeCount = signal(0);
  protected readonly userHasLiked = signal(false);
  protected readonly liking = signal(false);

  protected readonly followerCount = signal(0);
  protected readonly userIsFollowing = signal(false);
  protected readonly following = signal(false);
  private loreId = '';
  protected readonly handle: string = this.route.snapshot.paramMap.get('handle') ?? '';
  protected readonly context: 'community' | 'profile' | 'usuario' =
    this.route.snapshot.url[0]?.path === 'profile'
      ? 'profile'
      : this.route.snapshot.paramMap.has('handle')
        ? 'usuario'
        : 'community';

  protected readonly isOwner = computed(() => {
    const a = this.article();
    if (!a || !this.auth.isLoggedIn()) return false;
    return String(a.ownerId) === String(this.auth.getUserId());
  });

  protected readonly canEdit = computed(() => {
    const a = this.article();
    if (!a || !this.auth.isLoggedIn()) return false;
    if (a.isPersonal) return this.isOwner();
    return true; // lore da comunidade: qualquer logado pode editar
  });

  protected readonly canCopy = computed(() => {
    const a = this.article();
    if (!a || !this.auth.isLoggedIn() || this.isOwner()) return false;
    if (a.isPersonal) return a.allowCopy ?? false;
    return true; // lore da comunidade: todos podem copiar
  });

  ngOnInit(): void {
    this.loreId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loreService.get(this.loreId).subscribe({
      next: (data) => {
        this.article.set(data);
        this.likeCount.set(data.likeCount ?? 0);
        this.userHasLiked.set(data.userHasLiked ?? false);
        this.followerCount.set(data.followerCount ?? 0);
        this.userIsFollowing.set(data.userIsFollowing ?? false);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 403 ? 'Este conteúdo é privado.' : 'Artigo não encontrado.');
        this.loading.set(false);
      },
    });
  }

  protected categoryLabel(cat: LoreCategory): string {
    const map: Record<LoreCategory, string> = {
      WORLD: 'mundo',
      CHARACTER: 'personagem',
    };
    return map[cat] ?? cat;
  }

  protected statusLabel(s: string): string {
    const map: Record<string, string> = {
      TEORIA: 'teoria',
      CONSOLIDADO: 'consolidado',
      CANONICO: 'canônico',
    };
    return map[s];
  }

  protected loreIdStr(id: number): string {
    return String(id);
  }

  protected contentParagraphs(content: string): string[] {
    return content.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  }

  protected openCopyModal(): void {
    this.copyConflictId.set(undefined);
    this.showCopyModal.set(true);
  }

  protected toggleFollow(): void {
    if (this.following()) return;
    this.following.set(true);
    const following = this.userIsFollowing();
    const action = following
      ? this.loreService.unfollow(this.loreId)
      : this.loreService.follow(this.loreId);
    action.subscribe({
      next: (res) => {
        this.followerCount.set(res.followerCount);
        this.userIsFollowing.set(res.userIsFollowing);
        this.following.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) this.userIsFollowing.set(true);
        this.following.set(false);
      },
    });
  }

  protected toggleLike(): void {
    if (this.liking()) return;
    this.liking.set(true);
    const liked = this.userHasLiked();
    const action = liked
      ? this.loreService.unlike(this.loreId)
      : this.loreService.like(this.loreId);
    action.subscribe({
      next: (res) => {
        this.likeCount.set(res.likeCount);
        this.userHasLiked.set(res.userHasLiked);
        this.liking.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) this.userHasLiked.set(true);
        this.liking.set(false);
      },
    });
  }

  protected onCopyConfirm(event: CopyConfirmEvent): void {
    this.copying.set(true);
    this.personalLoreService
      .copyToProfile(this.loreId, event.filterType ?? 'all', event.replaceExistingId)
      .subscribe({
        next: (created) => {
          this.copying.set(false);
          this.showCopyModal.set(false);
          this.toast.success('Lore copiado!', 'O artigo foi adicionado ao seu perfil.');
          this.router.navigate(['/profile', 'lore', created.id], {
            queryParams: { personal: 'true' },
          });
        },
        error: (err: HttpErrorResponse) => {
          this.copying.set(false);
          if (err.status === 409) {
            this.copyConflictId.set(err.error?.conflictingId);
          } else if (err.status === 403) {
            this.showCopyModal.set(false);
            this.toast.error('Sem permissão', 'Este conteúdo não permite cópias.');
          } else {
            this.showCopyModal.set(false);
            this.toast.error('Erro', 'Erro ao copiar lore. Tente novamente.');
          }
        },
      });
  }
}
