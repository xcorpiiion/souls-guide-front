import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { QuestDetailData, QuestNode, questApiToSummary } from '../../shared/models/quest.model';
import { QuestService } from '../../core/services/quest.service';
import { QuestGraph } from './quest-graph/quest-graph';

@Component({
  selector: 'app-quest-detail',
  imports: [RouterLink, QuestGraph],
  templateUrl: './quest-detail.html',
  styleUrl: './quest-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly questService = inject(QuestService);

  protected readonly gameId: string = this.route.snapshot.paramMap.get('gameId') ?? '';
  private readonly questId: string = this.route.snapshot.paramMap.get('questId') ?? '';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly quest = signal<QuestDetailData | null>(null);
  protected readonly selectedNodeId = signal<string | null>(null);

  protected readonly selectedNode = (): QuestNode | null => {
    const id = this.selectedNodeId();
    const q = this.quest();
    return id && q ? (q.nodes.find((n) => n.id === id) ?? null) : null;
  };

  ngOnInit(): void {
    this.questService.get(this.questId).subscribe({
      next: (api) => {
        const summary = questApiToSummary(api);
        this.quest.set({ ...summary, nodes: [], edges: [], relatedQuests: [] });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Quest não encontrada.');
        this.loading.set(false);
      },
    });
  }

  protected onNodeSelect(id: string): void {
    this.selectedNodeId.set(this.selectedNodeId() === id ? null : id);
  }
}
