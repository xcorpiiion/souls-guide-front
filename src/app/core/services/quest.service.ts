import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QuestApi, QuestSummary, questApiToSummary } from '../../shared/models/quest.model';
import { Page } from '../../shared/models/page.model';

@Injectable({ providedIn: 'root' })
export class QuestService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/quests`;

  list(page = 0, size = 20): Observable<Page<QuestSummary>> {
    return this.http
      .get<Page<QuestApi>>(this.base, { params: { page, size } })
      .pipe(map((p) => ({ ...p, content: p.content.map(questApiToSummary) })));
  }

  get(id: string): Observable<QuestApi> {
    return this.http.get<QuestApi>(`${this.base}/${id}`);
  }
}
