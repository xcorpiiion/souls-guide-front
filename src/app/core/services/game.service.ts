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
import {
  Contributor,
  ContributorApi,
  ContributorRole,
  ContributorSort,
  contributorApiToView,
} from '../../shared/models/game-contributor.model';

export interface CreateGameRequest {
  name: string;
  developer?: string;
  releaseYear?: number;
  description?: string;
  tags?: string[];
}

/** Busca, filtro e ordem da aba de contribuidores. Tudo opcional; nada vira default aqui. */
export interface ContributorQuery {
  q?: string;
  role?: ContributorRole | null;
  sort?: ContributorSort;
  page?: number;
  size?: number;
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

  /**
   * Quem construiu o acervo do jogo.
   *
   * Aceita id ou slug, como `get` — é a mesma referência que veio na URL da página.
   * Busca e filtro vão para o servidor de propósito: o nome pelo qual se procura vem da
   * user-api, e filtrar no cliente só encontraria quem já está na página carregada.
   */
  contributors(gameRef: string, query: ContributorQuery = {}): Observable<Page<Contributor>> {
    return this.api
      .page<ContributorApi>(`${gameRef}/contributors`, {
        q: query.q?.trim() || undefined,
        role: query.role ?? undefined,
        sort: query.sort ?? 'CONTRIBUTIONS',
        page: query.page ?? 0,
        size: query.size ?? 30,
      })
      .pipe(map((p) => mapPage(p, contributorApiToView)));
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
