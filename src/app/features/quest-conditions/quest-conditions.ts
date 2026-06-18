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
import { catchError, switchMap } from 'rxjs/operators';
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

interface NodeOption {
  questId: string;
  questTitle: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

@Component({
  selector: 'app-quest-conditions',
  imports: [RouterLink],
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
  protected readonly selectedTriggerIds = signal<Set<string>>(new Set());
  protected readonly affectedQuestId = signal<string>('');
  protected readonly effect = signal<ConditionEffect>('HIDE');
  protected readonly endingNodeId = signal<string>('');
  protected readonly description = signal('');
  protected readonly isSpoiler = signal(true);

  protected readonly effectOptions: { value: ConditionEffect; label: string }[] = [
    { value: 'HIDE', label: 'esconder a quest afetada' },
    { value: 'REVEAL', label: 'revelar a quest afetada (pré-requisito)' },
    { value: 'FORCE_ENDING', label: 'sinalizar um final travado' },
  ];

  protected readonly nodeOptionsByQuest = computed(() => {
    const map = new Map<string, { questTitle: string; nodes: NodeOption[] }>();
    for (const opt of this.nodeOptions()) {
      if (!map.has(opt.questId)) map.set(opt.questId, { questTitle: opt.questTitle, nodes: [] });
      map.get(opt.questId)!.nodes.push(opt);
    }
    return [...map.entries()].map(([questId, v]) => ({ questId, ...v }));
  });

  protected readonly endingNodeOptions = computed(() =>
    this.nodeOptions().filter((n) => n.questId === this.affectedQuestId() && n.nodeType === 'end'),
  );

  protected readonly formValid = computed(
    () =>
      this.selectedTriggerIds().size > 0 &&
      !!this.affectedQuestId() &&
      this.description().trim().length > 0 &&
      (this.effect() !== 'FORCE_ENDING' || !!this.endingNodeId()),
  );

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

  protected toggleTrigger(nodeId: string): void {
    this.selectedTriggerIds.update((s) => {
      const next = new Set(s);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  protected isTriggerSelected(nodeId: string): boolean {
    return this.selectedTriggerIds().has(nodeId);
  }

  protected startCreate(): void {
    this.editingId.set(null);
    this.selectedTriggerIds.set(new Set());
    this.affectedQuestId.set('');
    this.effect.set('HIDE');
    this.endingNodeId.set('');
    this.description.set('');
    this.isSpoiler.set(true);
  }

  protected startEdit(condition: QuestCondition): void {
    this.editingId.set(condition.id);
    this.selectedTriggerIds.set(new Set(condition.triggerNodeIds));
    this.affectedQuestId.set(condition.affectedQuestId);
    this.effect.set(condition.effect);
    this.endingNodeId.set(condition.endingNodeId ?? '');
    this.description.set(condition.description);
    this.isSpoiler.set(condition.isSpoiler);
  }

  protected save(): void {
    if (!this.formValid() || this.saving()) return;
    this.saving.set(true);
    const request: QuestConditionRequest = {
      triggerNodeIds: [...this.selectedTriggerIds()],
      affectedQuestId: Number(this.affectedQuestId()),
      effect: this.effect(),
      endingNodeId: this.effect() === 'FORCE_ENDING' ? this.endingNodeId() : null,
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
      .pipe(switchMap((ok) => (ok ? this.conditionService.delete(condition.id) : of(null))))
      .subscribe({
        next: (result) => {
          if (result === null) return;
          this.conditions.update((list) => list.filter((c) => c.id !== condition.id));
          this.toast.success('Condição excluída', 'A condição foi removida.');
        },
        error: () => this.toast.error('Erro', 'Não foi possível excluir a condição.'),
      });
  }

  protected questTitle(questId: string): string {
    return this.quests().find((q) => q.id === questId)?.title ?? questId;
  }

  protected effectLabel(effect: ConditionEffect): string {
    return this.effectOptions.find((e) => e.value === effect)?.label ?? effect;
  }
}
