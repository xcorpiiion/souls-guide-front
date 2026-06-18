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
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-game-filter-dropdown',
  imports: [FormsModule],
  templateUrl: './game-filter-dropdown.html',
  styleUrl: './game-filter-dropdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameFilterDropdown {
  private readonly el = inject(ElementRef);

  readonly games = input.required<string[]>();
  readonly selected = input<string>('');
  readonly selectedChange = output<string>();

  protected readonly open = signal(false);
  protected readonly search = signal('');

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    return q ? this.games().filter((g) => g.toLowerCase().includes(q)) : this.games();
  });

  protected readonly label = computed(() => this.selected() || 'todos os jogos');

  protected toggle(): void {
    const opening = !this.open();
    this.open.set(opening);
    if (!opening) this.search.set('');
  }

  protected select(game: string): void {
    this.selectedChange.emit(game);
    this.open.set(false);
    this.search.set('');
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(e: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(e.target)) {
      this.open.set(false);
      this.search.set('');
    }
  }
}
