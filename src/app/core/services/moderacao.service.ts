import { inject, Injectable } from '@angular/core';
import { HttpService, Page } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import type {
  ApplyStrikeRequest,
  ContentReportDTO,
  CreateReportRequest,
  ModerationStatusDTO,
  ReportStatus,
  ResolveReportRequest,
  UserStrikeDTO,
} from '@xcorpiiion/canonico';

/**
 * Denúncia e fila de moderação.
 *
 * As duas coisas moram no mesmo service e em endereços diferentes de propósito: denunciar
 * é de qualquer pessoa logada (`/reports`), ler a fila é de quem modera (`/admin/...`).
 * Quem denuncia não vê o que os outros denunciaram.
 */
@Injectable({ providedIn: 'root' })
export class ModeracaoService {
  private readonly reports = inject(HttpService).resource('reports');
  private readonly admin = inject(HttpService).resource('admin');

  denunciar(body: CreateReportRequest): Observable<ContentReportDTO> {
    return this.reports.post<ContentReportDTO>('', body);
  }

  fila(status: ReportStatus = 'OPEN', page = 0, size = 20): Observable<Page<ContentReportDTO>> {
    return this.admin.page<ContentReportDTO>('reports', { status, page, size });
  }

  resolver(id: number, body: ResolveReportRequest): Observable<ContentReportDTO> {
    return this.admin.post<ContentReportDTO>(`reports/${id}/resolve`, body);
  }

  situacao(userId: string): Observable<ModerationStatusDTO> {
    return this.admin.get<ModerationStatusDTO>(`users/${userId}/moderation`);
  }

  aplicarStrike(body: ApplyStrikeRequest): Observable<UserStrikeDTO> {
    return this.admin.post<UserStrikeDTO>('strikes', body);
  }
}
