import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Game, gameToSummary, GameSummary } from '../../shared/models/game.model';
import { Page } from '../../shared/models/page.model';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/games`;

  list(page = 0, size = 20): Observable<Page<GameSummary>> {
    return this.http
      .get<Page<Game>>(this.base, { params: { page, size } })
      .pipe(map((p) => ({ ...p, content: p.content.map(gameToSummary) })));
  }

  get(id: string): Observable<Game> {
    return this.http.get<Game>(`${this.base}/${id}`);
  }
}
