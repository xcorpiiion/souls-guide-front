import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-quests',
  imports: [RouterOutlet],
  templateUrl: './quests.html',
  styleUrl: './quests.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Quests {}
