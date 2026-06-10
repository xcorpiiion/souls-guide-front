import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameSummary } from '../../shared/models/game.model';
import { GAMES_SUMMARY } from './games.mocks';

@Component({
  selector: 'app-games',
  imports: [RouterLink],
  templateUrl: './games.html',
  styleUrl: './games.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Games {
  protected readonly games: GameSummary[] = GAMES_SUMMARY;

  protected trackById(_: number, game: GameSummary): string {
    return game.id;
  }
}
