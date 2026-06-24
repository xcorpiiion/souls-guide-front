import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface NodeOption {
  questId: string;
  questTitle: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

@Component({
  selector: 'app-node-selector-panel',
  imports: [FormsModule],
  templateUrl: './node-selector-panel.html',
  styleUrl: './node-selector-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeSelectorPanel {
  readonly options = input<NodeOption[]>([]);
  readonly selectedIds = model<Set<string>>(new Set());

  protected readonly questSearch = signal('');
  protected readonly activeQuestId = signal<string | null>(null);

  protected readonly questGroups = computed(() => {
    const map = new Map<string, { questTitle: string; nodes: NodeOption[] }>();
    for (const opt of this.options()) {
      if (!map.has(opt.questId)) map.set(opt.questId, { questTitle: opt.questTitle, nodes: [] });
      map.get(opt.questId)!.nodes.push(opt);
    }
    return [...map.entries()].map(([questId, v]) => ({ questId, ...v }));
  });

  protected readonly filteredGroups = computed(() => {
    const term = this.questSearch().toLowerCase().trim();
    if (!term) return this.questGroups();
    return this.questGroups().filter((g) => g.questTitle.toLowerCase().includes(term));
  });

  protected readonly activeNodes = computed(() => {
    const id = this.activeQuestId();
    if (!id) return [];
    return this.questGroups().find((g) => g.questId === id)?.nodes ?? [];
  });

  protected readonly activeQuestTitle = computed(() => {
    const id = this.activeQuestId();
    if (!id) return '';
    return this.questGroups().find((g) => g.questId === id)?.questTitle ?? '';
  });

  protected readonly selectedList = computed(() => {
    const ids = this.selectedIds();
    const result: { nodeId: string; nodeLabel: string }[] = [];
    for (const g of this.questGroups()) {
      for (const n of g.nodes) {
        if (ids.has(n.nodeId)) result.push({ nodeId: n.nodeId, nodeLabel: n.nodeLabel });
      }
    }
    return result;
  });

  protected selectQuest(questId: string): void {
    this.activeQuestId.set(questId);
  }

  protected isSelected(nodeId: string): boolean {
    return this.selectedIds().has(nodeId);
  }

  protected toggle(nodeId: string): void {
    this.selectedIds.update((s) => {
      const next = new Set(s);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  protected remove(nodeId: string): void {
    this.selectedIds.update((s) => {
      const next = new Set(s);
      next.delete(nodeId);
      return next;
    });
  }
}
