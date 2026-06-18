import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  QuestCondition,
  QuestConditionApi,
  QuestConditionRequest,
  questConditionApiToModel,
} from '../../shared/models/quest-condition.model';

@Injectable({ providedIn: 'root' })
export class QuestConditionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}`;

  listByGame(gameId: string): Observable<QuestCondition[]> {
    return this.http
      .get<QuestConditionApi[]>(`${this.base}/games/${gameId}/conditions`)
      .pipe(map((list) => list.map(questConditionApiToModel)));
  }

  create(gameId: string, request: QuestConditionRequest): Observable<QuestCondition> {
    return this.http
      .post<QuestConditionApi>(`${this.base}/games/${gameId}/conditions`, request)
      .pipe(map(questConditionApiToModel));
  }

  update(id: string, request: QuestConditionRequest): Observable<QuestCondition> {
    return this.http
      .put<QuestConditionApi>(`${this.base}/conditions/${id}`, request)
      .pipe(map(questConditionApiToModel));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/conditions/${id}`);
  }
}
