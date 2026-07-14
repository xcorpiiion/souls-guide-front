import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { QuestService } from '../../../core/services/quest.service';
import { QuestProgressService } from '../../../core/services/quest-progress.service';
import { AuthService } from '../../../core/services/auth.service';
import { QuestDetailData, QuestNode, questApiToSummary } from '../../../shared/models/quest.model';
import { UserProgress } from '../../../shared/models/user-progress.model';
import { PageLoader } from '../../../shared/components/page-loader/page-loader';

@Component({
  selector: 'app-quest-map-quest-modal',
  imports: [RouterLink, PageLoader],
  templateUrl: './quest-map-quest-modal.html',
  styleUrl: './quest-map-quest-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestMapQuestModal implements OnInit {
  private readonly questService = inject(QuestService);
  private readonly progressService = inject(QuestProgressService);
  protected readonly auth = inject(AuthService);

  readonly questId = input.required<string>();
  readonly nodeId = input<string | null>(null);
  readonly gameId = input.required<string>();
  readonly closed = output<void>();
  readonly progressChanged = output<UserProgress>();

  protected readonly loading = signal(true);
  protected readonly quest = signal<QuestDetailData | null>(null);
  protected readonly completedNodeIds = signal<Set<string>>(new Set());
  protected readonly togglingNodeId = signal<string | null>(null);

  protected readonly taskNodes = computed<QuestNode[]>(() =>
    (this.quest()?.nodes ?? []).filter((n) => n.type === 'task'),
  );

  protected readonly focusedNode = computed<QuestNode | null>(() => {
    const nid = this.nodeId();
    if (!nid) return null;
    return this.quest()?.nodes.find((n) => n.id === nid) ?? null;
  });

  protected readonly progressDone = computed(
    () => this.taskNodes().filter((n) => this.completedNodeIds().has(n.id)).length,
  );
  protected readonly progressTotal = computed(() => this.taskNodes().length);
  protected readonly progressPct = computed(() =>
    this.progressTotal() ? Math.round((this.progressDone() / this.progressTotal()) * 100) : 0,
  );

  ngOnInit(): void {
    this.questService.get(this.questId()).subscribe({
      next: (api) => {
        const summary = questApiToSummary(api);
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
        this.loading.set(false);

        if (this.auth.isLoggedIn()) {
          this.progressService
            .getProgress(this.questId())
            .pipe(catchError(() => of(null)))
            .subscribe((p) => {
              if (p) this.completedNodeIds.set(new Set(p.completedNodeIds));
            });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  protected isNodeDone(nodeId: string): boolean {
    return this.completedNodeIds().has(nodeId);
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
        this.progressChanged.emit(p);
      },
      error: () => this.togglingNodeId.set(null),
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
