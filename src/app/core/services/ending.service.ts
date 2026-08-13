import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EndingApi,
  EndingDetailApi,
  EndingProgressApi,
  EndingSummary,
  endingApiToSummary,
} from '../../shared/models/ending.model';
import { FollowResponse } from '../../shared/models/quest.model';
import { LikeResponse } from './personal-quest.service';

@Injectable({ providedIn: 'root' })
export class EndingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}/endings`;

  /** A aba "Finais" de um jogo. Não é paginado: a ordem entre os finais é editorial. */
  listByGame(gameId: string): Observable<EndingSummary[]> {
    return this.http
      .get<EndingApi[]>(`${this.base}/by-game/${gameId}`)
      .pipe(map((list) => list.map(endingApiToSummary)));
  }

  get(id: string): Observable<EndingDetailApi> {
    return this.http.get<EndingDetailApi>(`${this.base}/${id}`);
  }

  getProgress(id: string): Observable<EndingProgressApi> {
    return this.http.get<EndingProgressApi>(`${this.base}/${id}/my-progress`);
  }

  markStep(id: string, stepId: string): Observable<EndingProgressApi> {
    return this.http.post<EndingProgressApi>(`${this.base}/${id}/my-progress/steps/${stepId}`, {});
  }

  unmarkStep(id: string, stepId: string): Observable<EndingProgressApi> {
    return this.http.delete<EndingProgressApi>(`${this.base}/${id}/my-progress/steps/${stepId}`);
  }

  /** Conseguir o final é declaração do jogador, não consequência de marcar os passos. */
  setAchieved(id: string, value: boolean): Observable<EndingProgressApi> {
    return this.http.put<EndingProgressApi>(
      `${this.base}/${id}/my-progress/achieved`,
      {},
      { params: { value } },
    );
  }

  like(id: string): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.base}/${id}/like`, {});
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.http.delete<LikeResponse>(`${this.base}/${id}/like`);
  }

  follow(id: string): Observable<FollowResponse> {
    return this.http.post<FollowResponse>(`${this.base}/${id}/follow`, {});
  }

  unfollow(id: string): Observable<FollowResponse> {
    return this.http.delete<FollowResponse>(`${this.base}/${id}/follow`);
  }
}
