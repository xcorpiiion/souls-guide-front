import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoreApi, LoreSummary, loreApiToSummary } from '../../shared/models/lore-article.model';
import { Page } from '../../shared/models/page.model';

@Injectable({ providedIn: 'root' })
export class LoreService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/lore`;

  list(page = 0, size = 20): Observable<Page<LoreSummary>> {
    return this.http
      .get<Page<LoreApi>>(this.base, { params: { page, size } })
      .pipe(map((p) => ({ ...p, content: p.content.map(loreApiToSummary) })));
  }

  get(id: string): Observable<LoreApi> {
    return this.http.get<LoreApi>(`${this.base}/${id}`);
  }
}
