import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoreService } from '../../core/services/lore.service';
import { PersonalLoreService } from '../../core/services/personal-lore.service';
import { GameService } from '../../core/services/game.service';
import { PendingUpload, StorageService } from '../../core/services/storage.service';
import { PageLoader } from '../../shared/components/page-loader/page-loader';
import { ImageUploader } from '../../shared/components/image-uploader/image-uploader';
import { GameSummary } from '../../shared/models/game.model';
import { LoreType, LoreTypeApi } from '../lore-create/lore-create';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import {
  extractImageFileKeys,
  loreImageMarkdown,
  renderMarkdown,
} from '../../shared/utils/lore-content';

@Component({
  selector: 'app-lore-editor',
  imports: [ReactiveFormsModule, RouterLink, PageLoader, ImageUploader],
  templateUrl: './lore-editor.html',
  styleUrl: './lore-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreEditor implements OnInit, OnDestroy, HasUnsavedChanges {
  private readonly loreService = inject(LoreService);
  private readonly personalLoreService = inject(PersonalLoreService);
  private readonly gameService = inject(GameService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  private readonly gameSearch$ = new Subject<string>();

  protected readonly loreId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly isPersonal = this.route.snapshot.queryParamMap.get('personal') === 'true';

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
  protected readonly loading = signal(true);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly showPreview = signal(false);

  protected readonly gameQuery = signal('');
  protected readonly gameSearching = signal(false);
  protected readonly gameResults = signal<GameSummary[]>([]);
  protected readonly selectedGame = signal<GameSummary | null>(null);
  protected readonly showGameDropdown = signal(false);

  // imagens
  protected readonly coverFileKey = signal<string | null>(null);
  protected readonly coverUrl = signal<string | null>(null);
  /** chave → URL exibível: as já confirmadas resolvem pela storage-api, as novas são blob. */
  protected readonly imagePreviews = signal<ReadonlyMap<string, string>>(new Map());
  private readonly pendingKeys = signal<string[]>([]);
  /** O que o artigo referenciava ao abrir — capa mais as imagens do texto. */
  private readonly initialKeys = signal<string[]>([]);
  protected readonly insertingImage = signal(false);

  protected readonly isCharacter = computed(() => this.loreType() === 'character');

  protected readonly previewContent = computed(() =>
    renderMarkdown(this.form.value.content ?? '', this.imagePreviews()),
  );

  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

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

  ngOnInit(): void {
    const load$ = this.isPersonal
      ? this.personalLoreService.getPersonal(this.loreId)
      : this.loreService.get(this.loreId);

    load$.subscribe({
      next: (data) => {
        this.loreType.set(data.type === 'CHARACTER' ? 'character' : 'world');
        this.tags.set(data.tags ?? []);
        this.selectedGame.set({ id: data.gameId, name: data.gameName } as unknown as GameSummary);
        this.gameQuery.set(data.gameName);
        this.form.patchValue({
          title: data.title,
          gameId: String(data.gameId),
          characterName: data.characterName ?? '',
          content: data.content,
        });
        this.coverFileKey.set(data.coverImageFileKey ?? null);
        this.initialKeys.set(
          [data.coverImageFileKey, ...extractImageFileKeys(data.content)].filter(
            (k): k is string => !!k,
          ),
        );
        this.resolveExistingImages(data.coverImageFileKey ?? null, data.content);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Não foi possível carregar o artigo.');
        this.loading.set(false);
      },
    });
  }

  protected setType(t: LoreType): void {
    this.loreType.set(t);
    if (t === 'world') this.form.patchValue({ characterName: '' });
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
    this.coverUrl.set(pending.previewUrl);
    this.pendingKeys.update((keys) => [...keys, pending.fileKey]);
    this.form.markAsDirty();
  }

  protected onCoverCleared(): void {
    this.coverFileKey.set(null);
    this.coverUrl.set(null);
    this.form.markAsDirty();
  }

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
        this.pendingKeys.update((keys) => [...keys, fileKey]);
        this.imagePreviews.update((map) => new Map(map).set(fileKey, previewUrl));
        this.writeAtCursor(textarea, `\n\n${loreImageMarkdown(fileKey, file.name)}\n\n`);
      },
      error: () => {
        this.insertingImage.set(false);
        this.errorMsg.set('Não foi possível enviar a imagem. Tente novamente.');
      },
    });
  }

  /** As imagens que já estavam no artigo têm URL; sem resolvê-las o preview ficaria vazio. */
  private resolveExistingImages(coverKey: string | null, content: string): void {
    const keys = [coverKey, ...extractImageFileKeys(content)].filter((k): k is string => !!k);
    if (!keys.length) return;

    this.storage.resolve(keys, 'LORE', this.loreId).subscribe((resolved) => {
      this.imagePreviews.update((map) => new Map([...map, ...resolved]));
      if (coverKey) this.coverUrl.set(resolved.get(coverKey) ?? null);
    });
  }

  private writeAtCursor(textarea: HTMLTextAreaElement, snippet: string): void {
    const current = this.form.value.content ?? '';
    const at = textarea.selectionStart ?? current.length;
    const next = current.slice(0, at) + snippet + current.slice(at);
    this.form.patchValue({ content: next });
    this.form.markAsDirty();

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
    const payload = {
      title: v.title!,
      type: this.loreType().toUpperCase() as LoreTypeApi,
      gameId: v.gameId!,
      characterName: this.isCharacter() ? v.characterName || undefined : undefined,
      content: v.content!,
      coverImageFileKey: this.coverFileKey() ?? undefined,
      tags: this.tags().length ? this.tags() : undefined,
    };

    const save$ = this.isPersonal
      ? this.personalLoreService.updatePersonal(this.loreId, payload)
      : this.loreService.update(this.loreId, payload);

    save$.subscribe({
      next: () => {
        this.form.markAsPristine();
        // Imagem tirada do meio do texto some junto com a referência: sem varrer o
        // conteúdo salvo, o arquivo continuaria no storage sem ninguém apontando.
        const emUso = new Set(
          [this.coverFileKey(), ...extractImageFileKeys(v.content ?? '')].filter(
            (k): k is string => !!k,
          ),
        );
        const descartadas = [...this.initialKeys(), ...this.pendingKeys()].filter(
          (k) => !emUso.has(k),
        );

        // O artigo já tem id: aqui a confirmação é só o passo que faltava para os
        // arquivos enviados nesta edição saírem de PENDING.
        this.storage.confirmAll(this.pendingKeys(), 'LORE', this.loreId).subscribe(() => {
          this.pendingKeys.set([]);
          this.initialKeys.set([...emUso]);
          this.storage.discard(descartadas, 'LORE', this.loreId).subscribe();

          if (this.isPersonal) {
            this.router.navigate(['/profile']);
          } else {
            this.router.navigate(['/lore', this.loreId]);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(
          err.status === 403
            ? 'Você não tem permissão para editar este artigo.'
            : 'Não foi possível salvar as alterações. Tente novamente.',
        );
        this.saving.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
