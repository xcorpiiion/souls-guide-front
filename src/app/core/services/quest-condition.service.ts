import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { map, Observable } from 'rxjs';
import {
  QuestCondition,
  QuestConditionApi,
  QuestConditionRequest,
  questConditionApiToModel,
} from '../../shared/models/quest-condition.model';

@Injectable({ providedIn: 'root' })
export class QuestConditionService {
  private readonly api = inject(HttpService).resource('');

  listByGame(gameId: string): Observable<QuestCondition[]> {
    return this.api
      .get<QuestConditionApi[]>(`games/${gameId}/conditions`)
      .pipe(map((list) => list.map(questConditionApiToModel)));
  }

  create(gameId: string, request: QuestConditionRequest): Observable<QuestCondition> {
    return this.api
      .post<QuestConditionApi>(`games/${gameId}/conditions`, request)
      .pipe(map(questConditionApiToModel));
  }

  update(id: string, request: QuestConditionRequest): Observable<QuestCondition> {
    return this.api
      .put<QuestConditionApi>(`conditions/${id}`, request)
      .pipe(map(questConditionApiToModel));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`conditions/${id}`);
  }
}
