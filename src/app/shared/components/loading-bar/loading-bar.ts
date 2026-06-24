import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingBarService } from '../../../core/services/loading-bar.service';

@Component({
  selector: 'app-loading-bar',
  template: `
    @if (bar.active()) {
      <div class="loading-bar" role="progressbar" aria-label="Carregando…">
        <div class="loading-bar__fill"></div>
      </div>
    }
  `,
  styleUrl: './loading-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingBar {
  protected readonly bar = inject(LoadingBarService);
}
