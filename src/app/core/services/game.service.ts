import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FeaturedGame, Game, gameToSummary, GameSummary } from '../../shared/models/game.model';
import { Page } from '../../shared/models/page.model';

export interface CreateGameRequest {
  name: string;
  developer?: string;
  releaseYear?: number;
  description?: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}/games`;

  list(page = 0, size = 20, name?: string): Observable<Page<GameSummary>> {
    const params: Record<string, string | number> = { page, size };
    if (name) params['name'] = name;
    return this.http
      .get<Page<Game>>(this.base, { params })
      .pipe(map((p) => ({ ...p, content: p.content.map(gameToSummary) })));
  }

  search(name: string): Observable<GameSummary[]> {
    return this.http
      .get<Page<Game>>(this.base, { params: { name, page: 0, size: 5 } })
      .pipe(map((p) => p.content.map(gameToSummary)));
  }

  getFeatured(): Observable<FeaturedGame[]> {
    return this.http.get<FeaturedGame[]>(`${this.base}/featured`);
  }

  get(id: string): Observable<Game> {
    return this.http.get<Game>(`${this.base}/${id}`);
  }

  create(data: CreateGameRequest): Observable<Game> {
    return this.http.post<Game>(this.base, data);
  }
}
