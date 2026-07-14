import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import {
  CdkDragDrop,
  CdkDropList,
  CdkDrag,
  CdkDragHandle,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { QuestService } from '../../core/services/quest.service';
import { QuestMapService } from '../../core/services/quest-map.service';
import { QuestProgressService } from '../../core/services/quest-progress.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { UserProgress } from '../../shared/models/user-progress.model';
import { QuestSummary } from '../../shared/models/quest.model';
import {
  MapSectionLocal,
  MapEntryLocal,
  NpcGroup,
  QuestMapPhase,
  QUEST_MAP_PHASE_LABELS,
  responseToLocal,
  localToRequest,
  groupByNpc,
} from '../../shared/models/quest-map.model';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';
import { QuestNode } from '../../shared/models/quest.model';
import { PageLoader } from '../../shared/components/page-loader/page-loader';
import { QuestMapQuestModal } from './quest-map-quest-modal/quest-map-quest-modal';

type PickerStep = 'questline' | 'details';

interface PickerState {
  sectionId: number | string;
  step: PickerStep;
  phase: QuestMapPhase | null;
  questlineId: string | null;
  questlineTitle: string | null;
  /** ID do nó selecionado na etapa 2 */
  questNodeId: string | null;
  /** Label do nó para exibição */
  questNodeLabel: string | null;
}

@Component({
  selector: 'app-quest-map-organizer',
  imports: [
    RouterLink,
    PageLoader,
    ConfirmModal,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    QuestMapQuestModal,
  ],
  templateUrl: './quest-map-organizer.html',
  styleUrl: './quest-map-organizer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestMapOrganizer implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questService = inject(QuestService);
  private readonly questMapService = inject(QuestMapService);
  private readonly questProgressService = inject(QuestProgressService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  protected readonly gameId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  private readonly isDirty = signal(false);

  protected readonly quests = signal<QuestSummary[]>([]);
  protected readonly sections = signal<MapSectionLocal[]>([]);
  protected readonly picker = signal<PickerState | null>(null);
  protected readonly expandedIds = signal<Set<number | string>>(new Set());

  protected readonly phases: QuestMapPhase[] = ['inicio', 'meio', 'fim', 'full'];
  protected readonly phaseLabels = QUEST_MAP_PHASE_LABELS;

  protected readonly editingSectionId = signal<number | string | null>(null);

  protected readonly pendingRemove = signal<{
    type: 'section' | 'entry';
    sectionId: number | string;
    questId?: string | null;
    nodeId?: string | null;
    label: string;
  } | null>(null);

  @ViewChild('sectionNameInput') private sectionNameInputRef?: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
      if (this.editingSectionId() !== null) {
        setTimeout(() => this.sectionNameInputRef?.nativeElement?.focus(), 0);
      }
    });
  }

  protected readonly loadingNodes = signal(false);
  protected readonly pickerNodes = signal<QuestNode[]>([]);

  /** Conjunto de pares "questId|nodeId" já adicionados em qualquer seção */
  protected readonly usedEntryKeys = computed(() => {
    const keys = new Set<string>();
    this.sections().forEach((s) =>
      s.entries.forEach((e) => keys.add(`${e.questId}|${e.nodeId ?? ''}`)),
    );
    return keys;
  });

  protected readonly hasOrphanedEntries = computed(() =>
    this.sections().some((s) => s.entries.some((e) => e.questId === null)),
  );

  protected readonly placedCount = computed(() => {
    const ids = new Set<string>();
    this.sections().forEach((s) =>
      s.entries.forEach((e) => {
        if (e.questId) ids.add(e.questId);
      }),
    );
    return ids.size;
  });
  protected readonly totalCount = computed(() => this.quests().length);

  protected readonly progressPct = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.placedCount() / total) * 100) : 0;
  });

  protected readonly availableForPicker = computed(() => this.quests());

  hasUnsavedChanges(): boolean {
    return this.isEditing() && this.isDirty();
  }

  protected startEditing(): void {
    this.snapshot = JSON.parse(JSON.stringify(this.sections()));
    this.isEditing.set(true);
  }

  protected cancelEditing(): void {
    this.sections.set(this.snapshot);
    this.isDirty.set(false);
    this.isEditing.set(false);
    this.picker.set(null);
    this.pickerNodes.set([]);
    this.editingSectionId.set(null);
  }

  protected readonly isEditing = signal(false);
  private snapshot: MapSectionLocal[] = [];

  protected readonly activeQuestId = signal<string | null>(null);
  protected readonly progressMap = signal<Map<string, UserProgress>>(new Map());

  protected questProgress(questId: string | null): UserProgress | null {
    return questId ? (this.progressMap().get(questId) ?? null) : null;
  }

  protected isQuestCompleted(questId: string | null): boolean {
    const p = this.questProgress(questId);
    if (!p || !p.completedNodeIds.length) return false;
    const quest = this.quests().find((q) => q.id === questId);
    return !!quest && p.completedNodeIds.length >= quest.stepCount;
  }

  protected completedSteps(questId: string | null): number {
    return this.questProgress(questId)?.completedNodeIds.length ?? 0;
  }

  protected totalSteps(questId: string | null): number {
    return this.quests().find((q) => q.id === questId)?.stepCount ?? 0;
  }

  ngOnInit(): void {
    this.questService.list(0, 100, undefined, this.gameId).subscribe({
      next: (page) => {
        this.quests.set(page.content.filter((q) => q.gameId === this.gameId));
        this.loadMap();
      },
      error: () => this.loadMap(),
    });
  }

  private loadMap(): void {
    this.questMapService
      .getMap(this.gameId)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.sections?.length) {
          const questTitleMap = new Map(this.quests().map((q) => [q.id, q.title]));
          const loaded = responseToLocal(res).map((s) => ({
            ...s,
            entries: s.entries.map((e) => ({
              ...e,
              questTitle: (e.questId && questTitleMap.get(e.questId)) || e.questTitle,
            })),
          }));
          this.sections.set(loaded);
          this.expandedIds.set(new Set(loaded.map((s) => s.id)));
          this.isDirty.set(false);
          this.loadProgress(loaded);
        }
        this.loading.set(false);
      });
  }

  private loadProgress(sections: MapSectionLocal[]): void {
    const ids = [
      ...new Set(
        sections.flatMap((s) => s.entries.map((e) => e.questId)).filter((id): id is string => !!id),
      ),
    ];
    if (!ids.length) return;
    const requests = Object.fromEntries(
      ids.map((id) => [
        id,
        this.questProgressService.getProgress(id).pipe(catchError(() => of(null))),
      ]),
    );
    forkJoin(requests).subscribe((results) => {
      const map = new Map<string, UserProgress>();
      for (const [id, progress] of Object.entries(results)) {
        if (progress) map.set(id, progress as UserProgress);
      }
      this.progressMap.set(map);
    });
  }

  protected isSectionOpen(id: number | string): boolean {
    return this.expandedIds().has(id);
  }

  protected toggleSection(id: number | string): void {
    this.expandedIds.update((s) => {
      const next = new Set(s);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected addSection(): void {
    const tempId = 'local-' + Date.now();
    const section: MapSectionLocal = { id: tempId, name: '', entries: [] };
    this.sections.update((s) => [...s, section]);
    this.expandedIds.update((s) => new Set([...s, tempId]));
    this.isDirty.set(true);
  }

  protected confirmRemoveSection(id: number | string, name: string, event: Event): void {
    event.stopPropagation();
    this.pendingRemove.set({ type: 'section', sectionId: id, label: name || 'sem nome' });
  }

  private doRemoveSection(id: number | string): void {
    this.isDirty.set(true);
    this.sections.update((s) => s.filter((x) => x.id !== id));
    this.expandedIds.update((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    if (this.picker()?.sectionId === id) this.picker.set(null);
  }

  protected updateSectionName(id: number | string, name: string): void {
    this.sections.update((s) => s.map((x) => (x.id === id ? { ...x, name } : x)));
    this.isDirty.set(true);
  }

  protected startEditingSection(id: number | string, event: Event): void {
    event.stopPropagation();
    this.editingSectionId.set(id);
  }

  protected stopEditingSection(): void {
    this.editingSectionId.set(null);
  }

  protected confirmRemoveEntry(
    sectionId: number | string,
    questId: string | null,
    nodeId: string | null,
    label: string,
  ): void {
    this.pendingRemove.set({ type: 'entry', sectionId, questId, nodeId, label });
  }

  private doRemoveEntry(
    sectionId: number | string,
    questId: string | null,
    nodeId: string | null,
  ): void {
    this.isDirty.set(true);
    this.sections.update((s) =>
      s.map((x) =>
        x.id === sectionId
          ? {
              ...x,
              entries: x.entries.filter((e) => !(e.questId === questId && e.nodeId === nodeId)),
            }
          : x,
      ),
    );
  }

  protected onRemoveConfirmed(): void {
    const p = this.pendingRemove();
    if (!p) return;
    if (p.type === 'section') this.doRemoveSection(p.sectionId);
    else if (p.type === 'entry')
      this.doRemoveEntry(p.sectionId, p.questId ?? null, p.nodeId ?? null);
    this.pendingRemove.set(null);
  }

  protected onRemoveCancelled(): void {
    this.pendingRemove.set(null);
  }

  protected groupByQuestline(entries: MapEntryLocal[]): NpcGroup[] {
    return groupByNpc(entries);
  }

  protected isAvailableNode(node: QuestNode): boolean {
    const p = this.picker();
    if (!p?.questlineId) return false;
    return !this.usedEntryKeys().has(`${p.questlineId}|${node.id}`);
  }

  protected questlineInitials(title: string | undefined): string {
    if (!title) return '?';
    return title
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  protected openPicker(sectionId: number | string): void {
    this.pickerNodes.set([]);
    this.picker.set({
      sectionId,
      step: 'questline',
      phase: null,
      questlineId: null,
      questlineTitle: null,
      questNodeId: null,
      questNodeLabel: null,
    });
  }

  protected closePicker(): void {
    this.picker.set(null);
    this.pickerNodes.set([]);
  }

  protected selectQuestline(id: string, title: string): void {
    this.picker.update((p) =>
      p
        ? {
            ...p,
            questlineId: id,
            questlineTitle: title,
            step: 'details',
            questNodeId: null,
            questNodeLabel: null,
            phase: null,
          }
        : p,
    );
    this.loadingNodes.set(true);
    this.pickerNodes.set([]);
    this.questService
      .listNodes(id)
      .pipe(catchError(() => of([] as QuestNode[])))
      .subscribe((nodes) => {
        this.pickerNodes.set(nodes.filter((n) => n.type !== 'start'));
        this.loadingNodes.set(false);
      });
  }

  protected backToQuestlineStep(): void {
    this.picker.update((p) =>
      p
        ? {
            ...p,
            step: 'questline',
            questlineId: null,
            questlineTitle: null,
            questNodeId: null,
            questNodeLabel: null,
            phase: null,
          }
        : p,
    );
    this.pickerNodes.set([]);
  }

  protected setPickerNode(event: Event): void {
    const nodeId = (event.target as HTMLSelectElement).value;
    const node = this.pickerNodes().find((n) => n.id === nodeId) ?? null;
    this.picker.update((p) =>
      p ? { ...p, questNodeId: node?.id ?? null, questNodeLabel: node?.label ?? null } : p,
    );
  }

  protected selectPhase(phase: QuestMapPhase): void {
    this.picker.update((p) => (p ? { ...p, phase } : p));
  }

  protected confirmPick(): void {
    const p = this.picker();
    if (!p?.questlineId || !p.questlineTitle || !p.phase) return;
    this.isDirty.set(true);
    const entry: MapEntryLocal = {
      questId: p.questlineId,
      questTitle: p.questlineTitle,
      nodeId: p.questNodeId,
      nodeTitle: p.questNodeLabel,
      phase: p.phase,
    };
    this.sections.update((s) =>
      s.map((x) => (x.id === p.sectionId ? { ...x, entries: [...x.entries, entry] } : x)),
    );
    this.picker.set(null);
    this.pickerNodes.set([]);
  }

  protected dropSection(event: CdkDragDrop<MapSectionLocal[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.isDirty.set(true);
    this.sections.update((s) => {
      const next = [...s];
      moveItemInArray(next, event.previousIndex, event.currentIndex);
      return next;
    });
  }

  protected dropEntry(sectionId: number | string, event: CdkDragDrop<MapEntryLocal[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.isDirty.set(true);
    this.sections.update((s) =>
      s.map((x) => {
        if (x.id !== sectionId) return x;
        const entries = [...x.entries];
        moveItemInArray(entries, event.previousIndex, event.currentIndex);
        return { ...x, entries };
      }),
    );
  }

  protected clearOrphanedEntries(): void {
    this.isDirty.set(true);
    this.sections.update((s) =>
      s.map((x) => ({ ...x, entries: x.entries.filter((e) => e.questId !== null) })),
    );
  }

  protected openQuestModal(questId: string): void {
    this.activeQuestId.set(questId);
  }

  protected closeQuestModal(): void {
    this.activeQuestId.set(null);
  }

  protected onProgressChanged(progress: UserProgress): void {
    this.progressMap.update((m) => {
      const next = new Map(m);
      next.set(progress.questId, progress);
      return next;
    });
  }

  protected navigateToQuest(questId: string): void {
    this.router.navigate(['/games', this.gameId, 'quests', questId]);
  }

  protected save(): void {
    if (this.saving()) return;
    this.saving.set(true);

    this.questMapService.saveMap(this.gameId, localToRequest(this.sections())).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.isDirty.set(false);
        this.isEditing.set(false);
        const questTitleMap = new Map(this.quests().map((q) => [q.id, q.title]));
        const saved = responseToLocal(res).map((s) => ({
          ...s,
          entries: s.entries.map((e) => ({
            ...e,
            questTitle: (e.questId && questTitleMap.get(e.questId)) || e.questTitle,
          })),
        }));
        this.sections.set(saved);
        this.expandedIds.set(new Set(saved.map((s) => s.id)));
        this.toast.success('Rota salva', 'A organização do mapa foi salva com sucesso.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erro', 'Não foi possível salvar a rota.');
      },
    });
  }
}
