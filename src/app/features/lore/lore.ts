import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-lore',
  templateUrl: './lore.html',
  styleUrl: './lore.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lore {}
