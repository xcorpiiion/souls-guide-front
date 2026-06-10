import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(type: ToastType, title: string, message: string, durationMs = 4000): void {
    const id = ++this.nextId;
    this.toasts.update((list) => [...list, { id, type, title, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(title: string, message: string): void { this.show('success', title, message); }
  error(title: string, message: string): void    { this.show('error', title, message); }
  info(title: string, message: string): void     { this.show('info', title, message); }
  warning(title: string, message: string): void  { this.show('warning', title, message); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
