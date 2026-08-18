import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import { GameQuestMapResponse, GameQuestMapRequest } from '../../shared/models/quest-map.model';

@Injectable({ providedIn: 'root' })
export class QuestMapService {
  private readonly api = inject(HttpService).resource('');

  getMap(gameId: string): Observable<GameQuestMapResponse> {
    return this.api.get<GameQuestMapResponse>(`games/${gameId}/quest-map`);
  }

  saveMap(gameId: string, body: GameQuestMapRequest): Observable<GameQuestMapResponse> {
    return this.api.put<GameQuestMapResponse>(`games/${gameId}/quest-map`, body);
  }
}
