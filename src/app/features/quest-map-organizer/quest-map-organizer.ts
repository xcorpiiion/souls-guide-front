import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { QuestService } from '../../core/services/quest.service';
import { QuestMapService } from '../../core/services/quest-map.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { QuestSummary } from '../../shared/models/quest.model';
import {
  MapSectionLocal,
  MapEntryLocal,
  QuestMapPhase,
  QUEST_MAP_PHASE_LABELS,
  responseToLocal,
  localToRequest,
} from '../../shared/models/quest-map.model';
import { PageLoader } from '../../shared/components/page-loader/page-loader';

type PickerStep = 'quest' | 'phase';

interface PickerState {
  sectionId: number | string;
  step: PickerStep;
  questId: string | null;
  questTitle: string | null;
  phase: QuestMapPhase | null;
}

@Component({
  selector: 'app-quest-map-organizer',
  imports: [RouterLink, PageLoader],
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

  protected readonly usedQuestIds = computed(() => {
    const ids = new Set<string>();
    this.sections().forEach((s) => s.entries.forEach((e) => ids.add(e.questId)));
    return ids;
  });

  protected readonly placedCount = computed(() => this.usedQuestIds().size);
  protected readonly totalCount = computed(() => this.quests().length);

  protected readonly progressPct = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.placedCount() / total) * 100) : 0;
  });

  protected readonly availableForPicker = computed(() =>
    this.quests().filter((q) => !this.usedQuestIds().has(q.id)),
  );

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

  protected removeSection(id: number | string): void {
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

  protected removeEntry(sectionId: number | string, questId: string): void {
    this.sections.update((s) =>
      s.map((x) =>
        x.id === sectionId ? { ...x, entries: x.entries.filter((e) => e.questId !== questId) } : x,
      ),
    );
  }

  protected openPicker(sectionId: number | string): void {
    this.picker.set({ sectionId, step: 'quest', questId: null, questTitle: null, phase: null });
  }

  protected closePicker(): void {
    this.picker.set(null);
  }

  protected selectQuest(questId: string, questTitle: string): void {
    this.picker.update((p) => (p ? { ...p, step: 'phase', questId, questTitle } : p));
  }

  protected backToQuestStep(): void {
    this.picker.update((p) =>
      p ? { ...p, step: 'quest', questId: null, questTitle: null, phase: null } : p,
    );
  }

  protected selectPhase(phase: QuestMapPhase): void {
    this.picker.update((p) => (p ? { ...p, phase } : p));
  }

  protected confirmPick(): void {
    const p = this.picker();
    if (!p?.questId || !p.phase || !p.questTitle) return;

    const entry: MapEntryLocal = { questId: p.questId, questTitle: p.questTitle, phase: p.phase };
    this.sections.update((s) =>
      s.map((x) => (x.id === p.sectionId ? { ...x, entries: [...x.entries, entry] } : x)),
    );
    this.picker.set(null);
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
        // Substitui as seções com os ids reais vindos do backend (seções novas ganham id numérico)
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
