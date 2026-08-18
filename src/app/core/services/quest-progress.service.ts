import { Injectable, inject } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import { UserProgress } from '../../shared/models/user-progress.model';

@Injectable({ providedIn: 'root' })
export class QuestProgressService {
  private readonly api = inject(HttpService).resource('quests');

  getProgress(questId: string): Observable<UserProgress> {
    return this.api.get<UserProgress>(`${questId}/my-progress`);
  }

  markNodeDone(questId: string, nodeId: string): Observable<UserProgress> {
    return this.api.post<UserProgress>(`${questId}/my-progress/nodes/${nodeId}`, null);
  }

  unmarkNodeDone(questId: string, nodeId: string): Observable<UserProgress> {
    return this.api.delete<UserProgress>(`${questId}/my-progress/nodes/${nodeId}`);
  }

  resetProgress(questId: string): Observable<void> {
    return this.api.delete<void>(`${questId}/my-progress`);
  }
}
