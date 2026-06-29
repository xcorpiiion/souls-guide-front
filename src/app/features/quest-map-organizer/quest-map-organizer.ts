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
import { catchError, of } from 'rxjs';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { QuestService } from '../../core/services/quest.service';
import { QuestMapService } from '../../core/services/quest-map.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';
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
import { QuestNode, QuestEdge } from '../../shared/models/quest.model';
import { PageLoader } from '../../shared/components/page-loader/page-loader';

interface PickerBranch {
  headerNode: QuestNode; // primeiro nó do ramo (ex: "ramo 1")
  subNodes: QuestNode[]; // nós subsequentes do ramo (ex: "nova etapa 1")
}

interface PickerNodeGroup {
  gatewayLabel: string | null; // null = nós de nível superior
  topNodes: QuestNode[]; // usado quando gatewayLabel === null
  branches: PickerBranch[]; // usado quando gatewayLabel !== null
}

type PickerStep = 'phase' | 'questline' | 'quest';

interface PickerState {
  sectionId: number | string;
  step: PickerStep;
  phase: QuestMapPhase | null;
  questlineId: string | null;
  questlineTitle: string | null;
  /** label do node selecionado na etapa 3 */
  questTitle: string | null;
}

@Component({
  selector: 'app-quest-map-organizer',
  imports: [RouterLink, PageLoader, ConfirmModal],
  templateUrl: './quest-map-organizer.html',
  styleUrl: './quest-map-organizer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestMapOrganizer implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questService = inject(QuestService);
  private readonly questMapService = inject(QuestMapService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  protected readonly gameId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

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
    questId?: string;
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
  protected readonly pickerGroups = signal<PickerNodeGroup[]>([]);

  /** Conjunto de pares "questId|questTitle" já adicionados em qualquer seção */
  protected readonly usedEntryKeys = computed(() => {
    const keys = new Set<string>();
    this.sections().forEach((s) =>
      s.entries.forEach((e) => keys.add(`${e.questId}|${e.questTitle}`)),
    );
    return keys;
  });

  protected readonly placedCount = computed(() => this.usedEntryKeys().size);
  protected readonly totalCount = computed(() => this.quests().length);

  protected readonly progressPct = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.placedCount() / total) * 100) : 0;
  });

  /** Questlines ainda disponíveis: remove apenas as que não têm mais nenhum nó livre */
  protected readonly availableForPicker = computed(() => {
    // Sem picker aberto ou ainda na etapa de questline: mostra todas as questlines
    // A filtragem de nós individuais já usados acontece dentro de pickerNodes (etapa 'quest')
    return this.quests();
  });

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
          const loaded = responseToLocal(res);
          this.sections.set(loaded);
          this.expandedIds.set(new Set(loaded.map((s) => s.id)));
        }
        this.loading.set(false);
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
  }

  protected confirmRemoveSection(id: number | string, name: string, event: Event): void {
    event.stopPropagation();
    this.pendingRemove.set({ type: 'section', sectionId: id, label: name || 'sem nome' });
  }

  private doRemoveSection(id: number | string): void {
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
    questId: string,
    questTitle: string,
  ): void {
    this.pendingRemove.set({ type: 'entry', sectionId, questId, label: questTitle });
  }

  private doRemoveEntry(sectionId: number | string, questId: string): void {
    this.sections.update((s) =>
      s.map((x) =>
        x.id === sectionId ? { ...x, entries: x.entries.filter((e) => e.questId !== questId) } : x,
      ),
    );
  }

  protected onRemoveConfirmed(): void {
    const p = this.pendingRemove();
    if (!p) return;
    if (p.type === 'section') this.doRemoveSection(p.sectionId);
    else if (p.type === 'entry' && p.questId) this.doRemoveEntry(p.sectionId, p.questId);
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
    return !this.usedEntryKeys().has(`${p.questlineId}|${node.label}`);
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
    this.pickerGroups.set([]);
    this.picker.set({
      sectionId,
      step: 'questline',
      phase: null,
      questlineId: null,
      questlineTitle: null,
      questTitle: null,
    });
  }

  protected closePicker(): void {
    this.picker.set(null);
    this.pickerGroups.set([]);
  }

  protected selectQuestline(id: string, title: string): void {
    this.picker.update((p) =>
      p ? { ...p, questlineId: id, questlineTitle: title, step: 'quest' } : p,
    );
    this.loadingNodes.set(true);
    this.pickerGroups.set([]);
    this.questService
      .get(id)
      .pipe(catchError(() => of(null)))
      .subscribe((q) => {
        const used = this.usedEntryKeys();
        this.pickerGroups.set(this.buildPickerGroups(q?.nodes ?? [], q?.edges ?? [], used, id));
        this.loadingNodes.set(false);
      });
  }

  private buildPickerGroups(
    nodes: QuestNode[],
    edges: QuestEdge[],
    used: Set<string>,
    questlineId: string,
  ): PickerNodeGroup[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const gateways = nodes.filter((n) => n.type === 'gateway');
    const isAvailable = (n: QuestNode) => !used.has(`${questlineId}|${n.label}`);

    // BFS a partir de um nó (exclusive), retorna tasks alcançáveis sem atravessar gateways
    const bfsFrom = (startId: string): QuestNode[] => {
      const visited = new Set<string>([startId]);
      const queue = edges.filter((e) => e.from === startId).map((e) => e.to);
      const result: QuestNode[] = [];
      while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const n = nodeMap.get(id);
        if (!n) continue;
        if (n.type === 'task') result.push(n);
        if (n.type !== 'gateway')
          edges.filter((e) => e.from === id).forEach((e) => queue.push(e.to));
      }
      return result;
    };

    // IDs de todos os tasks alcançáveis por algum gateway
    const inGateway = new Set<string>();
    for (const gw of gateways) bfsFrom(gw.id).forEach((n) => inGateway.add(n.id));

    const groups: PickerNodeGroup[] = [];

    // Tarefas fora de qualquer gateway
    const topNodes = nodes.filter(
      (n) => n.type === 'task' && !inGateway.has(n.id) && isAvailable(n),
    );
    if (topNodes.length) groups.push({ gatewayLabel: null, topNodes, branches: [] });

    // Um grupo por gateway, um branch por aresta de saída
    for (const gw of gateways) {
      const branches: PickerBranch[] = edges
        .filter((e) => e.from === gw.id)
        .map((e) => nodeMap.get(e.to))
        .filter((n): n is QuestNode => !!n && n.type === 'task')
        .map((headerNode) => ({
          headerNode,
          subNodes: bfsFrom(headerNode.id).filter(isAvailable),
        }))
        .filter((b) => isAvailable(b.headerNode) || b.subNodes.length > 0);

      if (branches.length) groups.push({ gatewayLabel: gw.label, topNodes: [], branches });
    }

    return groups;
  }

  protected backToQuestlineStep(): void {
    this.picker.update((p) =>
      p
        ? { ...p, step: 'questline', questlineId: null, questlineTitle: null, questTitle: null }
        : p,
    );
    this.pickerGroups.set([]);
  }

  protected selectQuestNode(nodeLabel: string): void {
    this.picker.update((p) => (p ? { ...p, questTitle: nodeLabel, step: 'phase' } : p));
  }

  protected backToQuestStep(): void {
    this.picker.update((p) => (p ? { ...p, step: 'quest', questTitle: null, phase: null } : p));
  }

  protected selectPhase(phase: QuestMapPhase): void {
    this.picker.update((p) => (p ? { ...p, phase } : p));
  }

  protected confirmPick(): void {
    const p = this.picker();
    if (!p?.questlineId || !p.questlineTitle || !p.questTitle || !p.phase) return;

    const entry: MapEntryLocal = {
      questId: p.questlineId,
      questTitle: p.questTitle,
      npcName: p.questlineTitle,
      phase: p.phase,
    };
    this.sections.update((s) =>
      s.map((x) => (x.id === p.sectionId ? { ...x, entries: [...x.entries, entry] } : x)),
    );
    this.picker.set(null);
    this.pickerGroups.set([]);
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
        const saved = responseToLocal(res);
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
