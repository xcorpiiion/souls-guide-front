import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import { GameSeries } from '../../shared/models/game-series.model';

/**
 * As séries de jogos.
 *
 * Não há método para "os jogos da série": eles saem de
 * `GameService.list({ seriesId })`, que já é a listagem paginada com card e contexto de
 * quem está olhando. Um segundo caminho para a mesma lista seria a segunda fonte de
 * verdade que o projeto inteiro evita.
 */
@Injectable({ providedIn: 'root' })
export class GameSeriesService {
  private readonly api = inject(HttpService).resource('series');

  list(): Observable<GameSeries[]> {
    return this.api.get<GameSeries[]>('');
  }

  /** Aceita id ou slug, como as rotas de jogo. */
  get(ref: string): Observable<GameSeries> {
    return this.api.get<GameSeries>(`${ref}`);
  }
}
