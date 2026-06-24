import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  OnInit,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import {
  QuestDetailData,
  QuestNode,
  QuestEdge,
  questApiToSummary,
} from '../../shared/models/quest.model';
import { QuestService } from '../../core/services/quest.service';
import { QuestConditionService } from '../../core/services/quest-condition.service';
import { QuestProgressService } from '../../core/services/quest-progress.service';
import { QuestVersionService } from '../../core/services/quest-version.service';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { AuthService } from '../../core/services/auth.service';
import {
  CopyToProfileModal,
  CopyConfirmEvent,
} from '../../shared/components/copy-to-profile-modal/copy-to-profile-modal';
import { CommentSection } from '../../shared/components/comment-section/comment-section';
import { QuestChecklist, TriggerEffect } from './quest-checklist/quest-checklist';
import { ToastService } from '../../shared/components/toast/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { PageLoader } from '../../shared/components/page-loader/page-loader';

@Component({
  selector: 'app-quest-detail',
  imports: [RouterLink, CopyToProfileModal, CommentSection, QuestChecklist, PageLoader],
  templateUrl: './quest-detail.html',
  styleUrl: './quest-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questService = inject(QuestService);
  private readonly conditionService = inject(QuestConditionService);
  private readonly progressService = inject(QuestProgressService);
  private readonly versionService = inject(QuestVersionService);
  private readonly personalQuestService = inject(PersonalQuestService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly destroyRef = inject(DestroyRef);

  protected readonly gameId = signal<string>(this.route.snapshot.paramMap.get('gameId') ?? '');
  protected readonly questId = signal<string>(this.route.snapshot.paramMap.get('questId') ?? '');
  protected readonly handle: string = this.route.snapshot.paramMap.get('handle') ?? '';
  protected readonly context: 'game' | 'profile' | 'usuario' = this.route.snapshot.paramMap.has(
    'gameId',
  )
    ? 'game'
    : this.route.snapshot.paramMap.has('handle')
      ? 'usuario'
      : 'profile';
  protected readonly previewVersion = signal<number | null>(
    Number(this.route.snapshot.queryParamMap.get('version')) || null,
  );
  protected readonly emptySet = new Set<string>();
  protected readonly snapshotNodes = signal<QuestNode[] | null>(null);
  protected readonly snapshotEdges = signal<QuestEdge[] | null>(null);
  protected readonly snapshotUnavailable = signal(false);
  protected readonly snapshotLoading = signal(false);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly quest = signal<QuestDetailData | null>(null);
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

  // ─── Progress ──────────────────────────────────────────────────────────────
  protected readonly completedNodeIds = signal<Set<string>>(new Set());
  protected readonly togglingNodeId = signal<string | null>(null);
  protected readonly taskNodes = computed<QuestNode[]>(() =>
    (this.quest()?.nodes ?? []).filter((n) => n.type === 'task'),
  );

  protected readonly blockedNodeIds = computed(
    () =>
      new Set((this.quest()?.nodes ?? []).filter((n) => n.status === 'BLOQUEADA').map((n) => n.id)),
  );

  protected readonly blockedNodeReasons = signal<
    Map<string, { questTitle: string; questId: string | null; effect: 'HIDE' | 'REVEAL' }>
  >(new Map());
  protected readonly triggerNodeConditions = signal<Map<string, TriggerEffect[]>>(new Map());
  protected readonly conditionsLoading = signal(false);

  protected readonly canEdit = computed(() => {
    const q = this.quest();
    if (!q || !this.auth.isLoggedIn()) return false;
    if (q.isPersonal) return q.isOwner === true;
    return true; // quest da comunidade: qualquer logado pode editar
  });

  // ─── Condições entre quests ──────────────────────────────────────────────
  protected readonly hiddenReasonRevealed = signal(false);

  protected revealHiddenReason(): void {
    this.hiddenReasonRevealed.set(true);
  }

  protected readonly progressTotal = computed(() => this.taskNodes().length);
  protected readonly progressDone = computed(
    () => this.taskNodes().filter((n) => this.completedNodeIds().has(n.id)).length,
  );
  protected readonly progressPct = computed(() =>
    this.progressTotal() ? Math.round((this.progressDone() / this.progressTotal()) * 100) : 0,
  );

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const questId = params.get('questId') ?? '';
          const gameId = params.get('gameId') ?? '';
          this.questId.set(questId);
          if (gameId) this.gameId.set(gameId);
          this.resetState();
          return this.questService.get(questId);
        }),
      )
      .subscribe({
        next: (api) => {
          const questId = this.questId();
          const summary = questApiToSummary(api);
          if (!this.gameId()) this.gameId.set(String(api.gameId));
          this.quest.set({
            ...summary,
            nodes: (api.nodes ?? []).map((n) => ({
              ...n,
              id: String(n.id),
              status: n.status ?? 'VISIVEL',
            })),
            edges: (api.edges ?? []).map((e) => ({
              ...e,
              id: String(e.id),
              from: String(e.from),
              to: String(e.to),
            })),
            relatedQuests: api.relatedQuests ?? [],
          });
          this.likeCount.set(api.likeCount ?? 0);
          this.userHasLiked.set(api.userHasLiked ?? false);
          this.followerCount.set(api.followerCount ?? 0);
          this.userIsFollowing.set(api.userIsFollowing ?? false);
          this.loading.set(false);

          const ver = this.previewVersion();
          if (ver !== null) {
            this.snapshotLoading.set(true);
            this.versionService.getSnapshot(questId, ver).subscribe({
              next: (snap) => {
                if (snap.nodes.length === 0) {
                  this.snapshotUnavailable.set(true);
                } else {
                  this.snapshotNodes.set(
                    snap.nodes.map((n) => ({
                      ...n,
                      id: String(n.id),
                      status: n.status ?? 'VISIVEL',
                    })),
                  );
                  this.snapshotEdges.set(
                    snap.edges.map((e) => ({
                      ...e,
                      id: String(e.id),
                      from: String(e.from),
                      to: String(e.to),
                    })),
                  );
                }
                this.snapshotLoading.set(false);
              },
              error: () => this.snapshotLoading.set(false),
            });
          }

          if (this.auth.isLoggedIn()) {
            this.progressService.getProgress(questId).subscribe({
              next: (p) => this.completedNodeIds.set(new Set(p.completedNodeIds)),
              error: () => {
                /* sem progresso ainda */
              },
            });
          }

          const gId = this.gameId();
          if (gId) {
            this.conditionsLoading.set(true);
            this.conditionService.listByGame(gId).subscribe({
              next: (conditions) => {
                const reasonMap = new Map<
                  string,
                  { questTitle: string; questId: string | null; effect: 'HIDE' | 'REVEAL' }
                >();
                const triggerMap = new Map<string, TriggerEffect[]>();
                for (const c of conditions) {
                  if (
                    (c.effect === 'HIDE' || c.effect === 'REVEAL') &&
                    c.affectedNodeIds.length &&
                    c.triggerQuestTitle
                  ) {
                    for (const nodeId of c.affectedNodeIds) {
                      reasonMap.set(nodeId, {
                        questTitle: c.triggerQuestTitle,
                        questId: c.triggerQuestId,
                        effect: c.effect,
                      });
                    }
                  }
                  if (c.affectedQuestTitle && c.affectedQuestId) {
                    const effect: TriggerEffect = {
                      effect: c.effect,
                      affectedQuestTitle: c.affectedQuestTitle,
                      affectedQuestId: c.affectedQuestId,
                      affectedNodeLabels: c.affectedNodeLabels ?? [],
                    };
                    for (const nodeId of c.triggerNodeIds) {
                      const existing = triggerMap.get(nodeId) ?? [];
                      triggerMap.set(nodeId, [...existing, effect]);
                    }
                  }
                }
                this.blockedNodeReasons.set(reasonMap);
                this.triggerNodeConditions.set(triggerMap);
                this.conditionsLoading.set(false);
              },
              error: () => {
                this.conditionsLoading.set(false);
              },
            });
          }
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(err.status === 403 ? 'Este conteúdo é privado.' : 'Quest não encontrada.');
          this.loading.set(false);
        },
      });
  }

  private resetState(): void {
    this.loading.set(true);
    this.error.set(null);
    this.quest.set(null);
    this.completedNodeIds.set(new Set());
    this.togglingNodeId.set(null);
    this.snapshotNodes.set(null);
    this.snapshotEdges.set(null);
    this.snapshotUnavailable.set(false);
    this.snapshotLoading.set(false);
    this.likeCount.set(0);
    this.userHasLiked.set(false);
    this.followerCount.set(0);
    this.userIsFollowing.set(false);
    this.showSharePopover.set(false);
    this.hiddenReasonRevealed.set(false);
    this.blockedNodeReasons.set(new Map());
    this.triggerNodeConditions.set(new Map());
    this.conditionsLoading.set(false);
  }

  protected toggleNodeDone(nodeId: string): void {
    if (this.togglingNodeId()) return;
    this.togglingNodeId.set(nodeId);
    const isDone = this.completedNodeIds().has(nodeId);
    const action = isDone
      ? this.progressService.unmarkNodeDone(this.questId(), nodeId)
      : this.progressService.markNodeDone(this.questId(), nodeId);

    action.subscribe({
      next: (p) => {
        this.completedNodeIds.set(new Set(p.completedNodeIds));
        this.togglingNodeId.set(null);
      },
      error: () => this.togglingNodeId.set(null),
    });
  }

  protected resetProgress(): void {
    this.progressService.resetProgress(this.questId()).subscribe({
      next: () => this.completedNodeIds.set(new Set()),
    });
  }

  protected openCopyModal(): void {
    this.copyConflictId.set(undefined);
    this.showCopyModal.set(true);
  }

  protected onCopyConfirm(event: CopyConfirmEvent): void {
    this.copying.set(true);
    this.personalQuestService.copyToProfile(this.questId(), event.replaceExistingId).subscribe({
      next: (created) => {
        this.copying.set(false);
        this.showCopyModal.set(false);
        this.toast.success('Quest copiada!', 'A quest foi adicionada ao seu perfil.');
        this.router.navigate(['/games', this.gameId, 'quests', created.id, 'edit'], {
          queryParams: { personal: 'true' },
        });
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
      ? this.questService.unfollow(this.questId())
      : this.questService.follow(this.questId());
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

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.showSharePopover.set(false);
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
      ? this.questService.unlike(this.questId())
      : this.questService.like(this.questId());
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
