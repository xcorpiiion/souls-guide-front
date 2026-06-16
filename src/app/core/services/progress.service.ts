import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProgress } from '../../shared/models/user-progress.model';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apis.soulsGuide}/progress`;

  getProgress(questId: string): Observable<UserProgress> {
    return this.http.get<UserProgress>(`${this.base}/quests/${questId}`);
  }

  completeNode(questId: string, nodeId: string): Observable<UserProgress> {
    return this.http.post<UserProgress>(
      `${this.base}/quests/${questId}/nodes/${nodeId}/complete`,
      {},
    );
  }

  uncompleteNode(questId: string, nodeId: string): Observable<UserProgress> {
    return this.http.delete<UserProgress>(
      `${this.base}/quests/${questId}/nodes/${nodeId}/complete`,
    );
  }
}
