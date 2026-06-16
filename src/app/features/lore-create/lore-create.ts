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
import { GameSummary } from '../../shared/models/game.model';

export type LoreType = 'world' | 'character';
export type LoreTypeApi = 'WORLD' | 'CHARACTER';

@Component({
  selector: 'app-lore-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './lore-create.html',
  styleUrl: './lore-create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreCreate implements OnDestroy {
  private readonly loreService = inject(LoreService);
  private readonly gameService = inject(GameService);
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

  protected readonly isCharacter = computed(() => this.loreType() === 'character');

  protected readonly previewContent = computed(() =>
    this.renderMarkdown(this.form.value.content ?? ''),
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
        tags: this.tags().length ? this.tags() : undefined,
      })
      .subscribe({
        next: (article) => {
          this.router.navigate(['/lore', article.id]);
        },
        error: () => {
          this.errorMsg.set('Não foi possível publicar o artigo. Tente novamente.');
          this.saving.set(false);
        },
      });
  }

  private renderMarkdown(md: string): string {
    return md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hbup])/gm, '')
      .trim();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
