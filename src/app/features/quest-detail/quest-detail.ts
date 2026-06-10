import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { QuestDetailData, QuestNode } from '../../shared/models/quest.model';
import { QUESTS_DETAIL } from './quest-detail.mocks';
import { QuestGraph } from './quest-graph/quest-graph';

@Component({
  selector: 'app-quest-detail',
  imports: [RouterLink, QuestGraph],
  templateUrl: './quest-detail.html',
  styleUrl: './quest-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestDetail {
  private readonly route = inject(ActivatedRoute);

  protected readonly quest: QuestDetailData | null =
    QUESTS_DETAIL.find((q) => q.id === (this.route.snapshot.paramMap.get('questId') ?? '')) ?? null;

  protected readonly gameId: string = this.route.snapshot.paramMap.get('gameId') ?? '';

  protected readonly selectedNodeId = signal<string | null>(null);

  protected readonly selectedNode = (): QuestNode | null => {
    const id = this.selectedNodeId();
    return id && this.quest ? (this.quest.nodes.find((n) => n.id === id) ?? null) : null;
  };

  protected onNodeSelect(id: string): void {
    this.selectedNodeId.set(this.selectedNodeId() === id ? null : id);
  }
}
