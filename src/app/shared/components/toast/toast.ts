import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toast, ToastService, ToastType } from './toast.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);

  protected icon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: '✓',
      info:    'ℹ',
      warning: '⚠',
      error:   '✕',
    };
    return icons[type];
  }

  protected dismiss(toast: Toast): void {
    this.toastService.dismiss(toast.id);
  }

  protected trackById(_: number, toast: Toast): number {
    return toast.id;
  }
}
