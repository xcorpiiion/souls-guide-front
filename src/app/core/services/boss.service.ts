import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import type {
  BossDTO,
  BossProgressResponse,
  BossRequest,
  BossSummaryDTO,
} from '@xcorpiiion/canonico';

/** Os filtros que a lista de chefes aceita. Todos opcionais. */
export interface BossQuery {
  gameId?: string;
  mandatory?: boolean;
  q?: string;
}

/**
 * O catálogo de chefes de um jogo.
 *
 * A leitura é pública — "como matar tal chefe" é a busca que traz gente de fora. O
 * progresso da run exige sessão, e o interceptor da plataforma cuida do cabeçalho.
 */
@Injectable({ providedIn: 'root' })
export class BossService {
  private readonly api = inject(HttpService).resource('bosses');

  /**
   * A lista inteira do jogo, na ordem recomendada.
   *
   * Não é paginada de propósito: a tela agrupa por região e mostra a barra de progresso
   * sobre o catálogo todo, e uma página de vinte cortaria região no meio.
   */
  list(query: BossQuery = {}): Observable<BossSummaryDTO[]> {
    return this.api.get<BossSummaryDTO[]>('', {
      ...(query.gameId ? { gameId: query.gameId } : {}),
      ...(query.mandatory ? { mandatory: true } : {}),
      ...(query.q ? { q: query.q } : {}),
    });
  }

  get(id: string): Observable<BossDTO> {
    return this.api.get<BossDTO>(id);
  }

  create(body: BossRequest): Observable<BossDTO> {
    return this.api.post<BossDTO>('', body);
  }

  update(id: string, body: BossRequest): Observable<BossDTO> {
    return this.api.put<BossDTO>(id, body);
  }

  /** Uma chamada por página, e não uma por chefe. */
  progresso(gameId: string): Observable<BossProgressResponse> {
    return this.api.get<BossProgressResponse>('my-progress', { gameId });
  }

  marcarDerrotado(id: number): Observable<BossProgressResponse> {
    return this.api.post<BossProgressResponse>(`${id}/defeated`, {});
  }

  desmarcarDerrotado(id: number): Observable<BossProgressResponse> {
    return this.api.delete<BossProgressResponse>(`${id}/defeated`);
  }
}
