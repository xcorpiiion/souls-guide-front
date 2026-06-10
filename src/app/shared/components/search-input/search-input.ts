import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';

@Component({
  selector: 'app-search-input',
  imports: [ReactiveFormsModule],
  templateUrl: './search-input.html',
  styleUrl: './search-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInput implements OnInit {
  readonly placeholder = input<string>('Buscar...');
  readonly debounceMs  = input<number>(300);
  readonly minLength   = input<number>(2);

  readonly searched = output<string>();

  protected readonly control = new FormControl('');

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.control.valueChanges.pipe(
      debounceTime(this.debounceMs()),
      map((v) => v?.trim() ?? ''),
      filter((v) => v.length === 0 || v.length >= this.minLength()),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((term) => this.searched.emit(term));
  }

  protected clear(): void {
    this.control.setValue('');
    this.searched.emit('');
  }
}
