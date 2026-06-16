import {
  ApplicationRef,
  createComponent,
  inject,
  Injectable,
  EnvironmentInjector,
} from '@angular/core';
import { from, Observable } from 'rxjs';
import { ConfirmModal } from '../../shared/components/confirm-modal/confirm-modal';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  ask(options: ConfirmOptions = {}): Observable<boolean> {
    return from(this.open(options));
  }

  private open(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const ref = createComponent(ConfirmModal, {
        environmentInjector: this.injector,
        hostElement: host,
      });

      if (options.title) ref.instance.title = options.title;
      if (options.message) ref.instance.message = options.message;
      if (options.confirmLabel) ref.instance.confirmLabel = options.confirmLabel;
      if (options.cancelLabel) ref.instance.cancelLabel = options.cancelLabel;

      const cleanup = (result: boolean) => {
        resolve(result);
        ref.destroy();
        host.remove();
      };

      ref.instance.confirmed.subscribe(() => cleanup(true));
      ref.instance.cancelled.subscribe(() => cleanup(false));

      this.appRef.attachView(ref.hostView);
      ref.changeDetectorRef.detectChanges();
    });
  }
}
