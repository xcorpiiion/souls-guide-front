import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { QuestService } from '../../core/services/quest.service';
import { QuestConditionService } from '../../core/services/quest-condition.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { QuestApi, QuestSummary } from '../../shared/models/quest.model';
import {
  ConditionEffect,
  QuestCondition,
  QuestConditionRequest,
} from '../../shared/models/quest-condition.model';
import {
  NodeOption,
  NodeSelectorPanel,
} from '../../shared/components/node-selector-panel/node-selector-panel';
import { PageLoader } from '../../shared/components/page-loader/page-loader';

@Component({
  selector: 'app-quest-conditions',
  imports: [RouterLink, NodeSelectorPanel, PageLoader],
  templateUrl: './quest-conditions.html',
  styleUrl: './quest-conditions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestConditions implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly questService = inject(QuestService);
  private readonly conditionService = inject(QuestConditionService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly gameId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly loading = signal(true);
  protected readonly quests = signal<QuestSummary[]>([]);
  protected readonly nodeOptions = signal<NodeOption[]>([]);
  protected readonly conditions = signal<QuestCondition[]>([]);
  protected readonly saving = signal(false);

  protected readonly editingId = signal<string | null>(null);
  protected readonly expandedConditionId = signal<string | null>(null);
  protected readonly searchQuery = signal('');

  protected readonly filteredConditions = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.conditions();
    return this.conditions().filter(
      (c) =>
        c.triggerQuestTitle?.toLowerCase().includes(q) ||
        c.affectedQuestTitle?.toLowerCase().includes(q) ||
        c.affectedNodeLabels.some((l) => l.toLowerCase().includes(q)) ||
        c.description.toLowerCase().includes(q),
    );
  });
  protected readonly selectedTriggerIds = signal<Set<string>>(new Set());
  protected readonly selectedAffectedNodeIds = signal<Set<string>>(new Set());
  protected readonly effect = signal<ConditionEffect>('HIDE');
  protected readonly description = signal('');
  protected readonly isSpoiler = signal(true);

  /** Apenas para FORCE_ENDING: quest selecionada */
  protected readonly forceEndingQuestId = signal<string>('');
  /** Apenas para FORCE_ENDING: nó selecionado */
  protected readonly forceEndingNodeId = signal<string>('');

  protected readonly effectOptions: { value: ConditionEffect; label: string }[] = [
    { value: 'HIDE', label: 'esconder a quest afetada' },
    { value: 'REVEAL', label: 'revelar a quest afetada (pré-requisito)' },
    { value: 'FORCE_ENDING', label: 'sinalizar um final travado' },
  ];

  /** Nós da quest selecionada para FORCE_ENDING */
  protected readonly forceEndingNodeOptions = computed(() =>
    this.nodeOptions().filter((n) => n.questId === this.forceEndingQuestId()),
  );

  /** questId derivado do primeiro nó afetado selecionado (HIDE/REVEAL). */
  protected readonly derivedAffectedQuestId = computed(() => {
    if (this.effect() === 'FORCE_ENDING') return this.forceEndingQuestId() || null;
    const firstNodeId = [...this.selectedAffectedNodeIds()][0];
    if (!firstNodeId) return null;
    return this.nodeOptions().find((n) => n.nodeId === firstNodeId)?.questId ?? null;
  });

  protected readonly formValid = computed(() => {
    const hasTriggers = this.selectedTriggerIds().size > 0;
    const hasDesc = this.description().trim().length > 0;
    if (this.effect() === 'FORCE_ENDING') {
      return hasTriggers && !!this.forceEndingQuestId() && !!this.forceEndingNodeId() && hasDesc;
    }
    const hasAffected = this.selectedAffectedNodeIds().size > 0 && !!this.derivedAffectedQuestId();
    return hasTriggers && hasAffected && hasDesc;
  });

  ngOnInit(): void {
    this.questService.list(0, 100, undefined, this.gameId).subscribe({
      next: (page) => {
        this.quests.set(page.content);
        this.loadNodeOptions(page.content);
      },
      error: () => this.loading.set(false),
    });
    this.loadConditions();
  }

  private loadNodeOptions(quests: QuestSummary[]): void {
    if (!quests.length) {
      this.loading.set(false);
      return;
    }
    forkJoin(
      quests.map((q) =>
        this.questService.get(q.id).pipe(catchError(() => of(null as QuestApi | null))),
      ),
    ).subscribe((details) => {
      const options: NodeOption[] = [];
      details.forEach((api, idx) => {
        if (!api) return;
        const quest = quests[idx];
        for (const node of api.nodes ?? []) {
          if (node.type === 'start') continue;
          options.push({
            questId: quest.id,
            questTitle: quest.title,
            nodeId: node.id,
            nodeLabel: node.label,
            nodeType: node.type,
          });
        }
      });
      this.nodeOptions.set(options);
      this.loading.set(false);
    });
  }

  private loadConditions(): void {
    this.conditionService.listByGame(this.gameId).subscribe({
      next: (list) => this.conditions.set(list),
      error: () => {
        /* silenciado — lista vazia é aceitável */
      },
    });
  }

  protected startCreate(): void {
    this.editingId.set(null);
    this.selectedTriggerIds.set(new Set());
    this.selectedAffectedNodeIds.set(new Set());
    this.effect.set('HIDE');
    this.description.set('');
    this.isSpoiler.set(true);
    this.forceEndingQuestId.set('');
    this.forceEndingNodeId.set('');
  }

  protected startEdit(condition: QuestCondition): void {
    this.editingId.set(condition.id);
    this.selectedTriggerIds.set(new Set(condition.triggerNodeIds));
    this.effect.set(condition.effect);
    this.description.set(condition.description);
    this.isSpoiler.set(condition.isSpoiler);
    if (condition.effect === 'FORCE_ENDING') {
      this.forceEndingQuestId.set(condition.affectedQuestId ?? '');
      this.forceEndingNodeId.set(condition.endingNodeId ?? '');
      this.selectedAffectedNodeIds.set(new Set());
    } else {
      this.selectedAffectedNodeIds.set(new Set(condition.affectedNodeIds));
      this.forceEndingQuestId.set('');
      this.forceEndingNodeId.set('');
    }
  }

  protected save(): void {
    if (!this.formValid() || this.saving()) return;
    this.saving.set(true);
    const isForceEnding = this.effect() === 'FORCE_ENDING';
    const affectedNodes = [...this.selectedAffectedNodeIds()];
    const request: QuestConditionRequest = {
      triggerNodeIds: [...this.selectedTriggerIds()],
      affectedNodeIds: isForceEnding ? null : affectedNodes,
      affectedQuestId: Number(this.derivedAffectedQuestId()),
      effect: this.effect(),
      endingNodeId: isForceEnding ? this.forceEndingNodeId() : null,
      description: this.description().trim(),
      isSpoiler: this.isSpoiler(),
    };

    const id = this.editingId();
    const action = id
      ? this.conditionService.update(id, request)
      : this.conditionService.create(this.gameId, request);

    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Condição salva', 'A condição foi salva com sucesso.');
        this.startCreate();
        this.loadConditions();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erro', 'Não foi possível salvar a condição.');
      },
    });
  }

  protected deleteCondition(condition: QuestCondition): void {
    this.confirm
      .ask({
        title: 'Excluir condição',
        message: `Tem certeza que deseja excluir esta condição? "${condition.description}"`,
        confirmLabel: 'excluir',
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.conditionService.delete(condition.id)),
      )
      .subscribe({
        next: () => {
          this.conditions.update((list) => list.filter((c) => c.id !== condition.id));
          this.toast.success('Condição excluída', 'A condição foi removida.');
        },
        error: () => this.toast.error('Erro', 'Não foi possível excluir a condição.'),
      });
  }

  protected toggleExpand(id: string): void {
    this.expandedConditionId.update((cur) => (cur === id ? null : id));
  }

  protected questColorClass(questId: string | null): string {
    const PALETTE = ['a', 'b', 'c', 'd', 'e', 'f'];
    if (!questId) return 'a';
    let h = 0;
    for (let i = 0; i < questId.length; i++) h = (h * 31 + questId.charCodeAt(i)) & 0xffff;
    return PALETTE[h % PALETTE.length];
  }

  protected questTitle(questId: string): string {
    return this.quests().find((q) => q.id === questId)?.title ?? questId;
  }

  protected nodeLabel(nodeId: string): string {
    return this.nodeOptions().find((n) => n.nodeId === nodeId)?.nodeLabel ?? nodeId;
  }

  protected effectLabel(effect: ConditionEffect): string {
    return this.effectOptions.find((e) => e.value === effect)?.label ?? effect;
  }
}
