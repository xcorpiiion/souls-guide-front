import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-games',
  templateUrl: './games.html',
  styleUrl: './games.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Games {}
