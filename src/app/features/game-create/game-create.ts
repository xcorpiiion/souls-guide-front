import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { GameService } from '../../core/services/game.service';
import { GameSummary } from '../../shared/models/game.model';

@Component({
  selector: 'app-game-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './game-create.html',
  styleUrl: './game-create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCreate implements OnDestroy {
  private readonly gameService = inject(GameService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  private readonly searchTrigger$ = new Subject<string>();

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    developer: [''],
    releaseYear: [''],
    description: [''],
  });

  protected readonly tags = signal<string[]>([]);
  protected readonly tagInput = signal('');
  protected readonly searchResults = signal<GameSummary[]>([]);
  protected readonly searching = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  constructor() {
    this.searchTrigger$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((name) => {
          if (name.trim().length < 2) {
            this.searchResults.set([]);
            this.searching.set(false);
            return [];
          }
          this.searching.set(true);
          return this.gameService.search(name);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (results) => {
          this.searchResults.set(results);
          this.searching.set(false);
        },
        error: () => this.searching.set(false),
      });
  }

  protected onNameInput(value: string): void {
    this.searchTrigger$.next(value);
  }

  protected addTag(): void {
    const val = this.tagInput().trim();
    if (!val || this.tags().includes(val)) return;
    this.tags.update((t) => [...t, val]);
    this.tagInput.set('');
  }

  protected onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  protected removeTag(tag: string): void {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  protected hasDuplicate(): boolean {
    const name = (this.form.value.name ?? '').trim().toLowerCase();
    return this.searchResults().some((g) => g.name.toLowerCase() === name);
  }

  protected submit(): void {
    if (this.form.invalid || this.hasDuplicate()) return;
    this.saving.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;
    this.gameService
      .create({
        name: v.name!,
        developer: v.developer || undefined,
        releaseYear: v.releaseYear ? Number(v.releaseYear) : undefined,
        description: v.description || undefined,
        tags: this.tags().length ? this.tags() : undefined,
      })
      .subscribe({
        next: (game) => {
          this.router.navigate(['/games', game.id]);
        },
        error: () => {
          this.errorMsg.set('Não foi possível publicar o jogo. Tente novamente.');
          this.saving.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
