import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuestApi, QuestEdge, QuestNode, QuestStatus } from '../../shared/models/quest.model';
import { QuestService } from '../../core/services/quest.service';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { ToastService } from '../../shared/components/toast/toast.service';
import { GraphSnapshot, QuestEditorList } from './quest-editor-list/quest-editor-list';
import { PageLoader } from '../../shared/components/page-loader/page-loader';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

@Component({
  selector: 'app-quest-editor',
  imports: [FormsModule, RouterLink, QuestEditorList, PageLoader],
  templateUrl: './quest-editor.html',
  styleUrl: './quest-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestEditor implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questService = inject(QuestService);
  private readonly personalQuestService = inject(PersonalQuestService);
  private readonly toast = inject(ToastService);

  protected readonly gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
  private readonly questId = this.route.snapshot.paramMap.get('questId');
  protected readonly isEdit = !!this.questId;
  private readonly isPersonal = this.route.snapshot.queryParamMap.get('personal') === 'true';
  protected readonly loading = signal(false);
  private readonly isDirty = signal(false);

  // ─── quest metadata ───────────────────────────────────────────────────────
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly questStatus = signal<QuestStatus>('TEORIA');

  // ─── graph state ─────────────────────────────────────────────────────────
  protected readonly nodes = signal<QuestNode[]>([]);
  protected readonly edges = signal<QuestEdge[]>([]);

  protected readonly statuses: { value: QuestStatus; label: string }[] = [
    { value: 'TEORIA', label: 'teoria' },
    { value: 'CONSOLIDADO', label: 'consolidado' },
    { value: 'CANONICO', label: 'canônico' },
  ];

  constructor() {
    if (!this.isEdit) {
      this.nodes.set([{ id: makeId('n'), type: 'start', label: 'início' }]);
    }
  }

  ngOnInit(): void {
    if (this.isEdit && this.questId) {
      this.loading.set(true);
      const load$ = this.isPersonal
        ? this.personalQuestService.getPersonal(this.questId)
        : this.questService.get(this.questId);
      load$.subscribe({
        next: (api) => {
          this.loadFromApi(api);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.cancel();
        },
      });
    }
  }

  private loadFromApi(api: QuestApi): void {
    this.title.set(api.title);
    this.description.set(api.description ?? '');
    this.questStatus.set(api.status ?? 'TEORIA');
    this.nodes.set(
      (api.nodes ?? []).map((n) => ({ ...n, id: String(n.id), status: n.status ?? 'VISIVEL' })),
    );
    this.edges.set(
      (api.edges ?? []).map((e) => ({
        ...e,
        id: String(e.id),
        from: String(e.from),
        to: String(e.to),
      })),
    );
    this.isDirty.set(false);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent): void {
    if (this.isDirty()) {
      e.preventDefault();
    }
  }

  protected onGraphChange(snapshot: GraphSnapshot): void {
    this.nodes.set(snapshot.nodes);
    this.edges.set(snapshot.edges);
    this.isDirty.set(true);
  }

  protected markDirty(): void {
    this.isDirty.set(true);
  }

  protected saveQuest(): void {
    const communityRequest = {
      title: this.title() || 'Nova Quest',
      description: this.description(),
      status: this.questStatus(),
      gameId: Number(this.gameId),
      nodes: this.nodes(),
      edges: this.edges(),
    };
    const personalRequest = {
      title: this.title() || 'Nova Quest',
      description: this.description(),
      status: this.questStatus(),
    };

    if (this.isEdit && this.questId) {
      const save$ = this.isPersonal
        ? this.personalQuestService.updatePersonal(this.questId, personalRequest)
        : this.questService.update(this.questId, communityRequest);
      save$.subscribe({
        next: () => {
          this.isDirty.set(false);
          if (this.isPersonal) {
            this.router.navigate(['/profile']);
          } else {
            this.router.navigate(['/games', this.gameId, 'quests', this.questId]);
          }
        },
        error: (err) => {
          if (err.status === 403) {
            this.toast.error(
              'Acesso negado',
              'Você está temporariamente banido de fazer edições. Aguarde o período de ban expirar.',
            );
          } else {
            this.toast.error('Erro', 'Não foi possível salvar a quest. Tente novamente.');
          }
        },
      });
    } else {
      this.questService.create(communityRequest).subscribe({
        next: (created) => {
          this.isDirty.set(false);
          this.router.navigate(['/games', this.gameId, 'quests', created.id]);
        },
        error: () => this.toast.error('Erro', 'Não foi possível criar a quest. Tente novamente.'),
      });
    }
  }

  hasUnsavedChanges(): boolean {
    return this.isDirty();
  }

  protected cancel(): void {
    if (this.isPersonal) {
      this.router.navigate(['/profile']);
    } else if (this.isEdit && this.questId) {
      this.router.navigate(['/games', this.gameId, 'quests', this.questId]);
    } else {
      this.router.navigate(['/games', this.gameId]);
    }
  }
}
