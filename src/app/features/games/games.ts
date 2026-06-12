import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameSummary } from '../../shared/models/game.model';
import { GameService } from '../../core/services/game.service';

@Component({
  selector: 'app-games',
  imports: [RouterLink],
  templateUrl: './games.html',
  styleUrl: './games.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Games implements OnInit {
  private readonly gameService = inject(GameService);

  protected readonly games = signal<GameSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.gameService.list().subscribe({
      next: (page) => {
        this.games.set(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os jogos.');
        this.loading.set(false);
      },
    });
  }

  protected trackById(_: number, game: GameSummary): string {
    return game.id;
  }
}
