import { inject, Injectable } from '@angular/core';
import { HttpService, Page } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import type { ItemDTO, ItemRequest, ItemType } from '@xcorpiiion/canonico';

/** Os filtros que a listagem do catálogo aceita. Todos opcionais. */
export interface ItemQuery {
  gameId?: string;
  type?: ItemType | null;
  q?: string;
  page?: number;
  size?: number;
}

/**
 * O catálogo de itens de um jogo.
 *
 * A leitura é pública — é a página que responde à busca de fora ("onde achar tal
 * talismã"). A escrita exige sessão, e o interceptor da plataforma cuida do cabeçalho.
 */
@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly api = inject(HttpService).resource('items');

  list(query: ItemQuery = {}): Observable<Page<ItemDTO>> {
    return this.api.page<ItemDTO>('', {
      page: query.page ?? 0,
      size: query.size ?? 24,
      ...(query.gameId ? { gameId: query.gameId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.q ? { q: query.q } : {}),
    });
  }

  get(id: string): Observable<ItemDTO> {
    return this.api.get<ItemDTO>(id);
  }

  create(body: ItemRequest): Observable<ItemDTO> {
    return this.api.post<ItemDTO>('', body);
  }

  update(id: string, body: ItemRequest): Observable<ItemDTO> {
    return this.api.put<ItemDTO>(id, body);
  }
}
