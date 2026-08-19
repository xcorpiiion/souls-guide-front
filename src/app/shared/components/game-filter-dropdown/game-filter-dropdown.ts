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

  /**
   * O que o botão mostra quando nada está escolhido.
   *
   * Nasceu filtro, onde "nada escolhido" quer dizer **todos**. Num formulário quer dizer o
   * oposto — falta escolher —, e o mesmo rótulo passaria a mentir. O padrão mantém os dez
   * usos de filtro exatamente como estavam.
   */
  readonly placeholder = input<string>('todos os jogos');

  /**
   * Se a opção "todos os jogos" aparece na lista.
   *
   * Num formulário ela não existe: um chefe pertence a um jogo, e oferecê-la seria
   * oferecer um estado que não dá para salvar.
   */
  readonly allowAll = input<boolean>(true);

  protected readonly open = signal(false);
  protected readonly search = signal('');

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    return q ? this.games().filter((g) => g.toLowerCase().includes(q)) : this.games();
  });

  protected readonly label = computed(() => this.selected() || this.placeholder());

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
