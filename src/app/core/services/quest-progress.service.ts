import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProgress } from '../../shared/models/user-progress.model';

const BASE = `${environment.apis.soulsGuide}/quests`;

@Injectable({ providedIn: 'root' })
export class QuestProgressService {
  private readonly http = inject(HttpClient);

  getProgress(questId: string): Observable<UserProgress> {
    return this.http.get<UserProgress>(`${BASE}/${questId}/my-progress`);
  }

  markNodeDone(questId: string, nodeId: string): Observable<UserProgress> {
    return this.http.post<UserProgress>(`${BASE}/${questId}/my-progress/nodes/${nodeId}`, null);
  }

  unmarkNodeDone(questId: string, nodeId: string): Observable<UserProgress> {
    return this.http.delete<UserProgress>(`${BASE}/${questId}/my-progress/nodes/${nodeId}`);
  }

  resetProgress(questId: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${questId}/my-progress`);
  }
}
