import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { QuestDetailData, QuestNode, questApiToSummary } from '../../shared/models/quest.model';
import { QuestService } from '../../core/services/quest.service';
import { QuestGraph } from './quest-graph/quest-graph';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { AuthService } from '../../core/services/auth.service';
import {
  CopyToProfileModal,
  CopyConfirmEvent,
} from '../../shared/components/copy-to-profile-modal/copy-to-profile-modal';
import { ToastService } from '../../shared/components/toast/toast.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-quest-detail',
  imports: [RouterLink, QuestGraph, CopyToProfileModal],
  templateUrl: './quest-detail.html',
  styleUrl: './quest-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly questService = inject(QuestService);
  private readonly personalQuestService = inject(PersonalQuestService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly gameId: string = this.route.snapshot.paramMap.get('gameId') ?? '';
  private readonly questId: string = this.route.snapshot.paramMap.get('questId') ?? '';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly quest = signal<QuestDetailData | null>(null);
  protected readonly selectedNodeId = signal<string | null>(null);

  protected readonly showCopyModal = signal(false);
  protected readonly copyConflictId = signal<number | undefined>(undefined);
  protected readonly copying = signal(false);

  protected readonly likeCount = signal(0);
  protected readonly userHasLiked = signal(false);
  protected readonly liking = signal(false);

  protected readonly followerCount = signal(0);
  protected readonly userIsFollowing = signal(false);
  protected readonly following = signal(false);

  protected readonly showSharePopover = signal(false);
  protected readonly copied = signal(false);

  protected readonly selectedNode = (): QuestNode | null => {
    const id = this.selectedNodeId();
    const q = this.quest();
    return id && q ? (q.nodes.find((n) => n.id === id) ?? null) : null;
  };

  ngOnInit(): void {
    this.questService.get(this.questId).subscribe({
      next: (api) => {
        const summary = questApiToSummary(api);
        this.quest.set({
          ...summary,
          nodes: api.nodes ?? [],
          edges: api.edges ?? [],
          relatedQuests: api.relatedQuests ?? [],
        });
        this.likeCount.set(api.likeCount ?? 0);
        this.userHasLiked.set(api.userHasLiked ?? false);
        this.followerCount.set(api.followerCount ?? 0);
        this.userIsFollowing.set(api.userIsFollowing ?? false);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 403 ? 'Este conteúdo é privado.' : 'Quest não encontrada.');
        this.loading.set(false);
      },
    });
  }

  protected onNodeSelect(id: string): void {
    this.selectedNodeId.set(this.selectedNodeId() === id ? null : id);
  }

  protected openCopyModal(): void {
    this.copyConflictId.set(undefined);
    this.showCopyModal.set(true);
  }

  protected onCopyConfirm(event: CopyConfirmEvent): void {
    this.copying.set(true);
    this.personalQuestService.copyToProfile(this.questId, event.replaceExistingId).subscribe({
      next: () => {
        this.copying.set(false);
        this.showCopyModal.set(false);
        this.toast.success('Quest copiada!', 'A quest foi adicionada ao seu perfil.');
      },
      error: (err: HttpErrorResponse) => {
        this.copying.set(false);
        if (err.status === 409) {
          this.copyConflictId.set(err.error?.conflictingId);
        } else if (err.status === 403) {
          this.showCopyModal.set(false);
          this.toast.error('Sem permissão', 'Você não tem permissão para copiar esta quest.');
        } else {
          this.showCopyModal.set(false);
          this.toast.error('Erro', 'Erro ao copiar quest. Tente novamente.');
        }
      },
    });
  }

  protected toggleFollow(): void {
    if (this.following()) return;
    this.following.set(true);
    const following = this.userIsFollowing();
    const action = following
      ? this.questService.unfollow(this.questId)
      : this.questService.follow(this.questId);
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

  protected toggleSharePopover(): void {
    this.showSharePopover.update((v) => !v);
    this.copied.set(false);
  }

  protected async copyLink(): Promise<void> {
    await navigator.clipboard.writeText(window.location.href);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  protected toggleLike(): void {
    if (this.liking()) return;
    this.liking.set(true);
    const liked = this.userHasLiked();
    const action = liked
      ? this.questService.unlike(this.questId)
      : this.questService.like(this.questId);
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
}
