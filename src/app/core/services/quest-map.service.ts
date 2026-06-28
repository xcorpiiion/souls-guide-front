import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameQuestMapResponse, GameQuestMapRequest } from '../../shared/models/quest-map.model';

@Injectable({ providedIn: 'root' })
export class QuestMapService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}`;

  getMap(gameId: string): Observable<GameQuestMapResponse> {
    return this.http.get<GameQuestMapResponse>(`${this.base}/games/${gameId}/quest-map`);
  }

  saveMap(gameId: string, body: GameQuestMapRequest): Observable<GameQuestMapResponse> {
    return this.http.put<GameQuestMapResponse>(`${this.base}/games/${gameId}/quest-map`, body);
  }
}
