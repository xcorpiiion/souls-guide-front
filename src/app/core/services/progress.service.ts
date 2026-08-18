import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import { UserProgress } from '../../shared/models/user-progress.model';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly api = inject(HttpService).resource('progress');

  getProgress(questId: string): Observable<UserProgress> {
    return this.api.get<UserProgress>(`quests/${questId}`);
  }

  completeNode(questId: string, nodeId: string): Observable<UserProgress> {
    return this.api.post<UserProgress>(`quests/${questId}/nodes/${nodeId}/complete`, {});
  }

  uncompleteNode(questId: string, nodeId: string): Observable<UserProgress> {
    return this.api.delete<UserProgress>(`quests/${questId}/nodes/${nodeId}/complete`);
  }
}
