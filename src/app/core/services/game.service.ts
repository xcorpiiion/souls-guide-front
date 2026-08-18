import { inject, Injectable } from '@angular/core';
import { HttpService, Page, mapPage } from '@xcorpiiion/ng-core';
import { map, Observable } from 'rxjs';
import {
  FeaturedGame,
  Game,
  GameListItem,
  gameListItemToSummary,
  GameSummary,
} from '../../shared/models/game.model';

export interface CreateGameRequest {
  name: string;
  developer?: string;
  releaseYear?: number;
  description?: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly api = inject(HttpService).resource('games');

  list(page = 0, size = 20, name?: string): Observable<Page<GameSummary>> {
    // `name` undefined sai da query; `page = 0` fica.
    return this.api
      .page<GameListItem>('', { page, size, name })
      .pipe(map((p) => mapPage(p, gameListItemToSummary)));
  }

  search(name: string): Observable<GameSummary[]> {
    return this.api
      .page<GameListItem>('', { name, page: 0, size: 5 })
      .pipe(map((p) => p.content.map(gameListItemToSummary)));
  }

  getFeatured(): Observable<FeaturedGame[]> {
    return this.api.get<FeaturedGame[]>(`featured`);
  }

  get(id: string): Observable<Game> {
    return this.api.get<Game>(`${id}`);
  }

  create(data: CreateGameRequest): Observable<Game> {
    return this.api.post<Game>('', data);
  }

  followGame(id: string): Observable<void> {
    return this.api.post<void>(`${id}/follow`, null);
  }

  unfollowGame(id: string): Observable<void> {
    return this.api.delete<void>(`${id}/follow`);
  }
}
