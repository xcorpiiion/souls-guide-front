import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingBarService {
  private readonly _pending = signal(0);

  readonly active = computed(() => this._pending() > 0);

  increment(): void {
    this._pending.update((n) => n + 1);
  }

  decrement(): void {
    this._pending.update((n) => Math.max(0, n - 1));
  }
}
