import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import {
  QuestEdge,
  QuestEndingType,
  QuestNode,
  QuestNodeType,
} from '../../../shared/models/quest.model';
import {
  ForkEntry,
  ListEntry,
  buildEntries,
} from '../../quest-detail/quest-checklist/quest-checklist';
import { ConfirmService } from '../../../core/services/confirm.service';

export interface GraphSnapshot {
  nodes: QuestNode[];
  edges: QuestEdge[];
}

interface TailContext {
  sourceIds: string[];
  convergesTo: string | null;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeNode(type: QuestNodeType, label: string): QuestNode {
  return { id: makeId('n'), type, label };
}

function tailContext(nodes: QuestNode[], edges: QuestEdge[]): TailContext | null {
  const entries = buildEntries(nodes, edges);
  const last = entries[entries.length - 1];
  if (!last) return null;
  if (last.kind === 'step') {
    if (last.node.type === 'end') {
      const sourceIds = edges.filter((e) => e.to === last.node.id).map((e) => e.from);
      return { sourceIds, convergesTo: last.node.id };
    }
    return { sourceIds: [last.node.id], convergesTo: null };
  }
  if (last.convergesTo === null) {
    // Fork sem convergência — sourceIds são os últimos nós de cada ramo
    const sourceIds = last.options.map((opt) => {
      const tail = opt.subSteps[opt.subSteps.length - 1] ?? opt.firstNode;
      return tail.id;
    });
    return { sourceIds, convergesTo: null };
  }
  const sourceIds = edges.filter((e) => e.to === last.convergesTo).map((e) => e.from);
  return { sourceIds, convergesTo: last.convergesTo };
}

function rewire(edges: QuestEdge[], ctx: TailContext, newNodeIds: string[]): QuestEdge[] {
  const result = ctx.convergesTo ? edges.filter((e) => e.to !== ctx.convergesTo) : [...edges];
  for (const s of ctx.sourceIds) {
    for (const n of newNodeIds) result.push({ id: makeId('e'), from: s, to: n });
  }
  if (ctx.convergesTo) {
    for (const n of newNodeIds) result.push({ id: makeId('e'), from: n, to: ctx.convergesTo });
  }
  return result;
}

// ─── Reordenação (mover etapa/bifurcação para cima ou para baixo) ─────────────
function entryHead(entry: ListEntry): string {
  return entry.kind === 'step' ? entry.node.id : entry.id;
}

function entryTail(entry: ListEntry): string | null {
  return entry.kind === 'step' ? entry.node.id : entry.convergesTo;
}

function isFixedEntry(entry: ListEntry): boolean {
  return entry.kind === 'step' && (entry.node.type === 'start' || entry.node.type === 'end');
}

function canSwapAt(entries: ListEntry[], index: number): boolean {
  if (index < 0 || index + 1 >= entries.length) return false;
  const a = entries[index];
  const b = entries[index + 1];
  if (isFixedEntry(a) || isFixedEntry(b)) return false;
  return entryTail(b) !== null;
}

function swapEdges(edges: QuestEdge[], a: ListEntry, b: ListEntry): QuestEdge[] {
  const aHead = entryHead(a);
  const aTail = entryTail(a)!;
  const bHead = entryHead(b);
  const bTail = entryTail(b)!;

  const predEdges = edges.filter((e) => e.to === aHead);
  const midEdges = edges.filter((e) => e.from === aTail && e.to === bHead);

  const removeIds = new Set([...predEdges, ...midEdges].map((e) => e.id));
  const added: QuestEdge[] = [];
  for (const p of predEdges) added.push({ id: makeId('e'), from: p.from, to: bHead });

  if (bHead === bTail) {
    // B é uma etapa simples — ela passa a apontar direto para A, e A herda o destino de B
    const succEdges = edges.filter((e) => e.from === bTail);
    for (const s of succEdges) removeIds.add(s.id);
    added.push({ id: makeId('e'), from: bTail, to: aHead });
    for (const s of succEdges) added.push({ id: makeId('e'), from: aTail, to: s.to });
  } else {
    // B é uma bifurcação — seus ramos passam a convergir em A, que assume o lugar
    // de B antes do ponto de convergência original (que pode ser compartilhado
    // com outras partes do grafo, então não é tocado diretamente)
    const intoBTail = edges.filter((e) => e.to === bTail && e.from !== aTail);
    for (const e of intoBTail) removeIds.add(e.id);
    for (const e of intoBTail) added.push({ id: makeId('e'), from: e.from, to: aHead });
    added.push({ id: makeId('e'), from: aTail, to: bTail });
  }

  const kept = edges.filter((e) => !removeIds.has(e.id));
  return [...kept, ...added];
}

@Component({
  selector: 'app-quest-editor-list',
  imports: [CdkDropList, CdkDrag],
  templateUrl: './quest-editor-list.html',
  styleUrl: './quest-editor-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestEditorList {
  private readonly confirm = inject(ConfirmService);
  private readonly el = inject(ElementRef);

  readonly nodes = input.required<QuestNode[]>();
  readonly edges = input.required<QuestEdge[]>();
  readonly graphChange = output<GraphSnapshot>();

  protected readonly entries = computed(() => buildEntries(this.nodes(), this.edges()));

  protected readonly canAppend = computed(() => tailContext(this.nodes(), this.edges()) !== null);

  protected readonly recentlyMovedIds = signal<Set<string>>(new Set());

  protected readonly selectedStepId = signal<string | null>(null);
  protected readonly selectedStep = computed(
    () => this.nodes().find((n) => n.id === this.selectedStepId()) ?? null,
  );

  protected readonly detailsWidth = signal(300);
  private resizeDrag: { startX: number; startW: number } | null = null;

  // ─── undo/redo ────────────────────────────────────────────────────────────
  private readonly undoStack = signal<GraphSnapshot[]>([]);
  private readonly redoStack = signal<GraphSnapshot[]>([]);
  protected readonly canUndo = computed(() => this.undoStack().length > 0);
  protected readonly canRedo = computed(() => this.redoStack().length > 0);

  protected readonly endingTypes: { value: string; label: string }[] = [
    { value: '', label: '— nenhum —' },
    { value: 'positive', label: 'positivo' },
    { value: 'tragic', label: 'trágico' },
    { value: 'neutral', label: 'neutro' },
  ];

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(e: MouseEvent): void {
    if (!this.selectedStepId()) return;
    const host = this.el.nativeElement as HTMLElement;
    // Cards are inside the host but outside .qel__details — clicking a card selects it, not closes
    if (host.contains(e.target as Node)) return;
    this.closeDetails();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName ?? '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    const key = e.key.toLowerCase();
    if (e.ctrlKey && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    } else if (e.ctrlKey && (key === 'y' || (key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.redo();
    }
  }

  protected undo(): void {
    const stack = this.undoStack();
    if (!stack.length) return;
    const prev = stack[stack.length - 1];
    this.undoStack.set(stack.slice(0, -1));
    this.redoStack.update((s) => [...s, { nodes: this.nodes(), edges: this.edges() }]);
    this.selectedStepId.set(null);
    this.emit(prev.nodes, prev.edges);
  }

  protected redo(): void {
    const stack = this.redoStack();
    if (!stack.length) return;
    const next = stack[stack.length - 1];
    this.redoStack.set(stack.slice(0, -1));
    this.undoStack.update((s) => [...s, { nodes: this.nodes(), edges: this.edges() }]);
    this.selectedStepId.set(null);
    this.emit(next.nodes, next.edges);
  }

  private pushUndo(): void {
    this.undoStack.update((s) => [...s, { nodes: this.nodes(), edges: this.edges() }].slice(-50));
    this.redoStack.set([]);
  }

  // ─── details panel resize ───────────────────────────────────────────────────
  protected onDetailsResizeStart(event: MouseEvent): void {
    event.preventDefault();
    this.resizeDrag = { startX: event.clientX, startW: this.detailsWidth() };
    const onMove = (e: MouseEvent) => {
      if (!this.resizeDrag) return;
      const delta = this.resizeDrag.startX - e.clientX;
      this.detailsWidth.set(Math.max(260, Math.min(560, this.resizeDrag.startW + delta)));
    };
    const onUp = () => {
      this.resizeDrag = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  protected entryKey(entry: ListEntry): string {
    return entry.kind === 'step' ? entry.node.id : entry.id;
  }

  protected canMoveUp(index: number): boolean {
    return canSwapAt(this.entries(), index - 1);
  }

  protected canMoveDown(index: number): boolean {
    return canSwapAt(this.entries(), index);
  }

  protected moveUp(index: number): void {
    this.moveEntryTo(index, index - 1);
  }

  protected moveDown(index: number): void {
    this.moveEntryTo(index, index + 1);
  }

  // ─── arrastar para reordenar (drag and drop) ──────────────────────────────
  protected onCdkDrop(event: CdkDragDrop<unknown>): void {
    this.moveEntryTo(event.previousIndex, event.currentIndex);
  }

  // Aplica a troca adjacente repetidamente até alcançar o destino — assim uma
  // ação de arrastar (ou um único clique programático) pode mover algo várias
  // posições de uma vez sem precisar clicar nas setas N vezes.
  private moveEntryTo(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    const nodes = this.nodes();
    let edges = this.edges();
    const step = fromIndex < toIndex ? 1 : -1;
    const movedIds = new Set<string>();
    let idx = fromIndex;

    while (idx !== toIndex) {
      const entries = buildEntries(nodes, edges);
      const lower = step === 1 ? idx : idx - 1;
      if (!canSwapAt(entries, lower)) break;
      const a = entries[lower];
      const b = entries[lower + 1];
      movedIds.add(this.entryKey(a));
      movedIds.add(this.entryKey(b));
      edges = swapEdges(edges, a, b);
      idx += step;
    }

    if (!movedIds.size) return;
    this.pushUndo();
    this.flagMoved(movedIds);
    this.emit(nodes, edges);
  }

  private flagMoved(ids: Set<string>): void {
    this.recentlyMovedIds.set(ids);
    setTimeout(() => {
      this.recentlyMovedIds.update((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
    }, 900);
  }

  protected isRecentlyMoved(entry: ListEntry): boolean {
    return this.recentlyMovedIds().has(this.entryKey(entry));
  }

  protected selectStep(id: string): void {
    this.selectedStepId.set(id);
  }

  protected closeDetails(): void {
    this.selectedStepId.set(null);
  }

  protected addStep(): void {
    const ctx = tailContext(this.nodes(), this.edges());
    if (!ctx) return;
    this.pushUndo();
    const newNode = makeNode('task', 'nova etapa');
    this.emit([...this.nodes(), newNode], rewire(this.edges(), ctx, [newNode.id]));
    this.selectStep(newNode.id);
  }

  protected addFork(): void {
    const ctx = tailContext(this.nodes(), this.edges());
    if (!ctx) return;
    this.pushUndo();
    const b1 = makeNode('task', 'ramo 1');
    const b2 = makeNode('task', 'ramo 2');
    this.emit([...this.nodes(), b1, b2], rewire(this.edges(), ctx, [b1.id, b2.id]));
  }

  protected addBranch(fork: ForkEntry): void {
    this.pushUndo();
    const newNode = makeNode('task', 'novo ramo');
    const newEdges = [...this.edges(), { id: makeId('e'), from: fork.id, to: newNode.id }];
    if (fork.convergesTo)
      newEdges.push({ id: makeId('e'), from: newNode.id, to: fork.convergesTo });
    this.emit([...this.nodes(), newNode], newEdges);
  }

  protected addStepToBranch(fork: ForkEntry, branchIndex: number): void {
    this.pushUndo();
    const option = fork.options[branchIndex];
    const tailId = option.subSteps.length
      ? option.subSteps[option.subSteps.length - 1].id
      : option.firstNode.id;
    const newNode = makeNode('task', 'nova etapa');
    let newEdges = [...this.edges()];
    if (fork.convergesTo) {
      newEdges = newEdges.filter((e) => !(e.from === tailId && e.to === fork.convergesTo));
      newEdges.push({ id: makeId('e'), from: tailId, to: newNode.id });
      newEdges.push({ id: makeId('e'), from: newNode.id, to: fork.convergesTo });
    } else {
      newEdges.push({ id: makeId('e'), from: tailId, to: newNode.id });
    }
    this.emit([...this.nodes(), newNode], newEdges);
    this.selectStep(newNode.id);
  }

  protected deleteStep(id: string): void {
    this.confirm
      .ask({
        title: 'Excluir etapa',
        message:
          'Tem certeza que deseja excluir esta etapa? Essa ação não pode ser desfeita pelo Ctrl+Z depois de salvar.',
        confirmLabel: 'excluir',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.pushUndo();
        const inEdge = this.edges().find((e) => e.to === id);
        const outEdges = this.edges().filter((e) => e.from === id);
        const newNodes = this.nodes().filter((n) => n.id !== id);
        let newEdges = this.edges().filter((e) => e.from !== id && e.to !== id);
        if (inEdge && outEdges.length === 1) {
          newEdges = [...newEdges, { id: makeId('e'), from: inEdge.from, to: outEdges[0].to }];
        }
        if (this.selectedStepId() === id) this.selectedStepId.set(null);
        this.emit(newNodes, newEdges);
      });
  }

  protected deleteBranch(fork: ForkEntry, branchIndex: number): void {
    this.confirm
      .ask({
        title: 'Excluir ramo',
        message: 'Tem certeza que deseja excluir este ramo e todas as etapas dentro dele?',
        confirmLabel: 'excluir',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.pushUndo();
        const option = fork.options[branchIndex];
        const idsToRemove = new Set([option.firstNode.id, ...option.subSteps.map((s) => s.id)]);
        if (this.selectedStepId() && idsToRemove.has(this.selectedStepId()!)) {
          this.selectedStepId.set(null);
        }
        const newNodes = this.nodes().filter((n) => !idsToRemove.has(n.id));
        const newEdges = this.edges().filter(
          (e) => !idsToRemove.has(e.from) && !idsToRemove.has(e.to),
        );
        this.emit(newNodes, newEdges);
      });
  }

  protected deleteFork(fork: ForkEntry): void {
    this.confirm
      .ask({
        title: 'Excluir bifurcação',
        message: `Tem certeza que deseja excluir toda a bifurcação e seus ${fork.options.length} ramos?`,
        confirmLabel: 'excluir',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.pushUndo();
        const idsToRemove = new Set<string>();
        for (const opt of fork.options) {
          idsToRemove.add(opt.firstNode.id);
          for (const s of opt.subSteps) idsToRemove.add(s.id);
        }
        if (this.selectedStepId() && idsToRemove.has(this.selectedStepId()!)) {
          this.selectedStepId.set(null);
        }
        const newNodes = this.nodes().filter((n) => !idsToRemove.has(n.id));
        let newEdges = this.edges().filter(
          (e) => !idsToRemove.has(e.from) && !idsToRemove.has(e.to),
        );
        if (fork.convergesTo) {
          newEdges = [...newEdges, { id: makeId('e'), from: fork.id, to: fork.convergesTo }];
        }
        this.emit(newNodes, newEdges);
      });
  }

  protected updateStepLabel(value: string): void {
    this.updateField('label', value);
  }
  protected updateStepDescription(value: string): void {
    this.updateField('description', value || null);
  }
  protected updateStepLocation(value: string): void {
    this.updateField('location', value || null);
  }
  protected updateStepTags(value: string): void {
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    this.updateField('tags', tags.length ? tags : undefined);
  }
  protected updateStepEndingType(value: string): void {
    this.updateField('endingType', (value as QuestEndingType) || null);
  }
  protected updateStepType(value: string): void {
    this.updateField('type', value as QuestNodeType);
  }

  protected stepTagsString(node: QuestNode): string {
    return node.tags?.join(', ') ?? '';
  }

  private updateField<K extends keyof QuestNode>(field: K, value: QuestNode[K]): void {
    const id = this.selectedStepId();
    if (!id) return;
    this.emit(
      this.nodes().map((n) => (n.id === id ? { ...n, [field]: value } : n)),
      this.edges(),
    );
  }

  private emit(nodes: QuestNode[], edges: QuestEdge[]): void {
    this.graphChange.emit({ nodes, edges });
  }
}
