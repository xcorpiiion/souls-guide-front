import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  readonly isLoading = signal(false);

  show(): void {
    this.count++;
    this.isLoading.set(true);
  }

  hide(): void {
    if (this.count > 0) this.count--;
    if (this.count === 0) this.isLoading.set(false);
  }

  forceHide(): void {
    this.count = 0;
    this.isLoading.set(false);
  }
}
