import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestApi, QuestEdge, QuestNode } from '../../shared/models/quest.model';
import { QuestService } from '../../core/services/quest.service';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { PendingUpload, StorageService } from '../../core/services/storage.service';
import { HasUnsavedChanges } from '@xcorpiiion/ng-core';
import { ToastService } from '@xcorpiiion/ui';
import { GraphSnapshot, QuestEditorList } from './quest-editor-list/quest-editor-list';
import { PfPageLoader } from '@xcorpiiion/ui';
import { ImageUploader } from '../../shared/components/image-uploader/image-uploader';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

@Component({
  selector: 'app-quest-editor',
  imports: [FormsModule, QuestEditorList, PfPageLoader, ImageUploader],
  templateUrl: './quest-editor.html',
  styleUrl: './quest-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestEditor implements OnInit, HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questService = inject(QuestService);
  private readonly personalQuestService = inject(PersonalQuestService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);

  protected readonly gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
  private readonly questId = this.route.snapshot.paramMap.get('questId');
  protected readonly isEdit = !!this.questId;
  private readonly isPersonal = this.route.snapshot.queryParamMap.get('personal') === 'true';
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  private readonly isDirty = signal(false);

  // ─── quest metadata ───────────────────────────────────────────────────────
  protected readonly title = signal('');
  protected readonly description = signal('');

  // ─── graph state ─────────────────────────────────────────────────────────
  protected readonly nodes = signal<QuestNode[]>([]);
  protected readonly edges = signal<QuestEdge[]>([]);

  // ─── imagens ─────────────────────────────────────────────────────────────
  protected readonly coverFileKey = signal<string | null>(null);
  protected readonly coverUrl = signal<string | null>(null);
  /** chave → URL das imagens já confirmadas, resolvidas numa chamada ao carregar. */
  protected readonly imageUrls = signal<ReadonlyMap<string, string>>(new Map());
  /** Enviadas nesta sessão de edição: só saem de PENDING depois que a quest é salva. */
  private readonly pendingKeys = signal<string[]>([]);
  /** O que a quest referenciava ao abrir — base para descobrir o que sobrou sem uso. */
  private readonly initialKeys = signal<string[]>([]);

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
    this.coverFileKey.set(api.coverImageFileKey ?? null);
    this.initialKeys.set(
      [api.coverImageFileKey, ...(api.nodes ?? []).map((n) => n.imageFileKey)].filter(
        (k): k is string => !!k,
      ),
    );
    this.resolveExistingImages(api);
    this.isDirty.set(false);
  }

  /** Chaves que a quest referencia agora — capa mais a imagem de cada passo. */
  private currentKeys(): string[] {
    return [this.coverFileKey(), ...this.nodes().map((n) => n.imageFileKey)].filter(
      (k): k is string => !!k,
    );
  }

  /**
   * Uma chamada resolve a capa e as imagens de todos os passos: os arquivos pertencem à
   * quest, não a cada nó, justamente para caber numa listagem só.
   */
  private resolveExistingImages(api: QuestApi): void {
    if (!this.questId) return;
    const keys = [api.coverImageFileKey, ...(api.nodes ?? []).map((n) => n.imageFileKey)].filter(
      (k): k is string => !!k,
    );
    if (!keys.length) return;

    this.storage.resolve(keys, 'QUEST', this.questId).subscribe((resolved) => {
      this.imageUrls.set(resolved);
      if (api.coverImageFileKey) {
        this.coverUrl.set(resolved.get(api.coverImageFileKey) ?? null);
      }
    });
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

  protected onCoverUploaded(pending: PendingUpload): void {
    this.coverFileKey.set(pending.fileKey);
    this.coverUrl.set(pending.previewUrl);
    this.trackPending(pending);
    this.isDirty.set(true);
  }

  protected onCoverCleared(): void {
    this.coverFileKey.set(null);
    this.coverUrl.set(null);
    this.isDirty.set(true);
  }

  /**
   * Registra a chave para confirmar depois de salvar, e guarda a URL de preview.
   *
   * A URL importa porque o painel de detalhes do passo é destruído ao fechar: o
   * arquivo ainda não foi confirmado, então não tem URL de leitura, e sem alguém aqui
   * segurando a blob a imagem sumia da tela mesmo estando gravada no nó.
   */
  protected trackPending(pending: PendingUpload): void {
    this.pendingKeys.update((keys) => [...keys, pending.fileKey]);
    this.imageUrls.update((map) => new Map(map).set(pending.fileKey, pending.previewUrl));
  }

  protected saveQuest(): void {
    if (this.saving()) return;
    this.saving.set(true);
    const communityRequest = {
      title: this.title() || 'Nova Quest',
      description: this.description(),
      gameId: Number(this.gameId),
      coverImageFileKey: this.coverFileKey() ?? undefined,
      nodes: this.nodes(),
      edges: this.edges(),
    };
    const personalRequest = {
      title: this.title() || 'Nova Quest',
      description: this.description(),
      coverImageFileKey: this.coverFileKey() ?? undefined,
    };

    if (this.isEdit && this.questId) {
      const save$ = this.isPersonal
        ? this.personalQuestService.updatePersonal(this.questId, personalRequest)
        : this.questService.update(this.questId, communityRequest);
      save$.subscribe({
        next: () => {
          this.saving.set(false);
          this.isDirty.set(false);
          this.confirmImages(this.questId!, () => {
            if (this.isPersonal) {
              this.router.navigate(['/profile']);
            } else {
              this.router.navigate(['/games', this.gameId, 'quests', this.questId]);
            }
          });
        },
        error: (err) => {
          this.saving.set(false);
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
          this.saving.set(false);
          this.isDirty.set(false);
          this.confirmImages(String(created.id), () => {
            this.router.navigate(['/games', this.gameId, 'quests', created.id]);
          });
        },
        error: () => {
          this.saving.set(false);
          this.toast.error('Erro', 'Não foi possível criar a quest. Tente novamente.');
        },
      });
    }
  }

  /**
   * Amarra os arquivos enviados à quest recém-salva. Navegar antes seria uma corrida
   * perdida: os uploads ficariam PENDING e a limpeza de órfãos os apagaria.
   */
  private confirmImages(questId: string, done: () => void): void {
    // Diferenca, e nao rastreio de eventos de troca: o editor tem undo/redo, entao
    // marcar "trocou" no momento do upload apagaria arquivo que o usuario desfez e
    // voltou a usar. O que vale e o que sobrou referenciado no fim.
    const emUso = new Set(this.currentKeys());
    const descartadas = [...this.initialKeys(), ...this.pendingKeys()].filter((k) => !emUso.has(k));

    this.storage.confirmAll(this.pendingKeys(), 'QUEST', questId).subscribe(() => {
      this.pendingKeys.set([]);
      this.initialKeys.set(this.currentKeys());
      // Nao prende a navegacao: a limpeza e melhor-esforco, e o que escapar aqui
      // continua sendo lixo silencioso, nao erro visivel para o usuario.
      this.storage.discard(descartadas, 'QUEST', questId).subscribe();
      done();
    });
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
