import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { map, Observable } from 'rxjs';
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
  private readonly api = inject(HttpService).resource('endings');

  /** A aba "Finais" de um jogo. Não é paginado: a ordem entre os finais é editorial. */
  listByGame(gameId: string): Observable<EndingSummary[]> {
    return this.api
      .get<EndingApi[]>(`by-game/${gameId}`)
      .pipe(map((list) => list.map(endingApiToSummary)));
  }

  get(id: string): Observable<EndingDetailApi> {
    return this.api.get<EndingDetailApi>(`${id}`);
  }

  getProgress(id: string): Observable<EndingProgressApi> {
    return this.api.get<EndingProgressApi>(`${id}/my-progress`);
  }

  markStep(id: string, stepId: string): Observable<EndingProgressApi> {
    return this.api.post<EndingProgressApi>(`${id}/my-progress/steps/${stepId}`, {});
  }

  unmarkStep(id: string, stepId: string): Observable<EndingProgressApi> {
    return this.api.delete<EndingProgressApi>(`${id}/my-progress/steps/${stepId}`);
  }

  /** Conseguir o final é declaração do jogador, não consequência de marcar os passos. */
  setAchieved(id: string, value: boolean): Observable<EndingProgressApi> {
    return this.api.put<EndingProgressApi>(`${id}/my-progress/achieved`, {}, { value });
  }

  like(id: string): Observable<LikeResponse> {
    return this.api.post<LikeResponse>(`${id}/like`, {});
  }

  unlike(id: string): Observable<LikeResponse> {
    return this.api.delete<LikeResponse>(`${id}/like`);
  }

  follow(id: string): Observable<FollowResponse> {
    return this.api.post<FollowResponse>(`${id}/follow`, {});
  }

  unfollow(id: string): Observable<FollowResponse> {
    return this.api.delete<FollowResponse>(`${id}/follow`);
  }
}
