import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-loader',
  templateUrl: './page-loader.html',
  styleUrl: './page-loader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLoader {
  readonly message = input('Carregando…');
}
