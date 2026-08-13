import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { LoreService } from '../../core/services/lore.service';
import { GameService } from '../../core/services/game.service';
import { PendingUpload, StorageService } from '../../core/services/storage.service';
import { GameSummary } from '../../shared/models/game.model';
import { ImageUploader } from '../../shared/components/image-uploader/image-uploader';
import {
  extractImageFileKeys,
  loreImageMarkdown,
  renderMarkdown,
} from '../../shared/utils/lore-content';

export type LoreType = 'world' | 'character';
export type LoreTypeApi = 'WORLD' | 'CHARACTER';

@Component({
  selector: 'app-lore-create',
  imports: [ReactiveFormsModule, RouterLink, ImageUploader],
  templateUrl: './lore-create.html',
  styleUrl: './lore-create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreCreate implements OnDestroy {
  private readonly loreService = inject(LoreService);
  private readonly gameService = inject(GameService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  private readonly gameSearch$ = new Subject<string>();

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    gameId: ['', Validators.required],
    characterName: [''],
    content: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected readonly loreType = signal<LoreType>('world');
  protected readonly tags = signal<string[]>([]);
  protected readonly tagInput = signal('');
  protected readonly saving = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly showPreview = signal(false);

  // game search
  protected readonly gameQuery = signal('');
  protected readonly gameSearching = signal(false);
  protected readonly gameResults = signal<GameSummary[]>([]);
  protected readonly selectedGame = signal<GameSummary | null>(null);
  protected readonly showGameDropdown = signal(false);

  // imagens
  protected readonly coverFileKey = signal<string | null>(null);
  protected readonly inlineKeys = signal<string[]>([]);
  /** Tudo que subiu nesta sessão, inclusive o que foi trocado e ficou para trás. */
  private readonly uploadedKeys = signal<string[]>([]);
  /** chave → blob local: o arquivo ainda não foi confirmado, então não tem URL de leitura. */
  protected readonly inlinePreviews = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly insertingImage = signal(false);

  protected readonly isCharacter = computed(() => this.loreType() === 'character');

  protected readonly previewContent = computed(() =>
    renderMarkdown(this.form.value.content ?? '', this.inlinePreviews()),
  );

  constructor() {
    this.gameSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) {
            this.gameResults.set([]);
            this.gameSearching.set(false);
            return [];
          }
          this.gameSearching.set(true);
          return this.gameService.search(q);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (results) => {
          this.gameResults.set(results);
          this.gameSearching.set(false);
          this.showGameDropdown.set(results.length > 0);
        },
        error: () => this.gameSearching.set(false),
      });
  }

  protected setType(t: LoreType): void {
    this.loreType.set(t);
    if (t === 'world') {
      this.form.patchValue({ characterName: '' });
    }
  }

  protected onGameInput(value: string): void {
    this.gameQuery.set(value);
    if (!value.trim()) {
      this.selectedGame.set(null);
      this.form.patchValue({ gameId: '' });
      this.showGameDropdown.set(false);
    }
    this.gameSearch$.next(value);
  }

  protected selectGame(game: GameSummary): void {
    this.selectedGame.set(game);
    this.gameQuery.set(game.name);
    this.form.patchValue({ gameId: String(game.id) });
    this.showGameDropdown.set(false);
    this.gameResults.set([]);
  }

  protected addTag(): void {
    const val = this.tagInput().trim().toLowerCase();
    if (!val || this.tags().includes(val) || this.tags().length >= 5) return;
    this.tags.update((t) => [...t, val]);
    this.tagInput.set('');
  }

  protected onTagKeydown(e: KeyboardEvent, input: HTMLInputElement): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      this.addTag();
    } else if (e.key === 'Backspace' && !input.value) {
      this.tags.update((t) => t.slice(0, -1));
    }
  }

  protected removeTag(tag: string): void {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  protected togglePreview(): void {
    this.showPreview.update((v) => !v);
  }

  protected onCoverUploaded(pending: PendingUpload): void {
    this.coverFileKey.set(pending.fileKey);
    this.uploadedKeys.update((keys) => [...keys, pending.fileKey]);
  }

  protected onCoverCleared(): void {
    this.coverFileKey.set(null);
  }

  /**
   * Envia a imagem e escreve a referência onde o cursor estava. O texto guarda a chave,
   * não a URL — a URL é assinada e expiraria dentro do artigo.
   */
  protected insertInlineImage(event: Event, textarea: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    const problem = this.storage.validateImage(file);
    if (problem) {
      this.errorMsg.set(problem);
      return;
    }

    this.errorMsg.set(null);
    this.insertingImage.set(true);
    this.storage.upload(file, 'LORE_IMAGE').subscribe({
      next: ({ fileKey, previewUrl }) => {
        this.insertingImage.set(false);
        this.inlineKeys.update((keys) => [...keys, fileKey]);
        this.uploadedKeys.update((keys) => [...keys, fileKey]);
        this.inlinePreviews.update((map) => new Map(map).set(fileKey, previewUrl));
        this.writeAtCursor(textarea, `\n\n${loreImageMarkdown(fileKey, file.name)}\n\n`);
      },
      error: () => {
        this.insertingImage.set(false);
        this.errorMsg.set('Não foi possível enviar a imagem. Tente novamente.');
      },
    });
  }

  private writeAtCursor(textarea: HTMLTextAreaElement, snippet: string): void {
    const current = this.form.value.content ?? '';
    const at = textarea.selectionStart ?? current.length;
    const next = current.slice(0, at) + snippet + current.slice(at);
    this.form.patchValue({ content: next });

    const caret = at + snippet.length;
    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  protected submit(): void {
    if (this.form.invalid) return;
    if (this.isCharacter() && !this.form.value.characterName?.trim()) return;
    this.saving.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;
    this.loreService
      .create({
        title: v.title!,
        type: this.loreType().toUpperCase() as LoreTypeApi,
        gameId: v.gameId!,
        characterName: this.isCharacter() ? v.characterName || undefined : undefined,
        content: v.content!,
        coverImageFileKey: this.coverFileKey() ?? undefined,
        tags: this.tags().length ? this.tags() : undefined,
      })
      .subscribe({
        next: (article) => {
          // Só agora existe um id para amarrar os arquivos. Confirmar depois de navegar
          // seria uma corrida perdida, então a navegação espera.
          const emUso = new Set(
            [this.coverFileKey(), ...extractImageFileKeys(v.content ?? '')].filter(
              (k): k is string => !!k,
            ),
          );
          const descartadas = this.uploadedKeys().filter((k) => !emUso.has(k));

          this.storage.confirmAll([...emUso], 'LORE', String(article.id)).subscribe(() => {
            // O que subiu e acabou não usado vai embora agora, em vez de esperar uma
            // hora pela limpeza de órfãos.
            this.storage.discard(descartadas, 'LORE', String(article.id)).subscribe();
            this.router.navigate(['/lore', article.id]);
          });
        },
        error: () => {
          this.errorMsg.set('Não foi possível publicar o artigo. Tente novamente.');
          this.saving.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
