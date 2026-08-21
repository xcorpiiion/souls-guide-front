import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import { GameSection, GameSectionPayload } from '../../shared/models/game-section.model';

/**
 * As seções de um jogo — "região" no souls-like, "capítulo" no terror.
 *
 * A rota é aninhada no jogo porque seção não existe sozinha: não há tela que liste seções
 * de jogos diferentes, e `/sections?gameId=` daria a entender que há.
 *
 * O rótulo não vem daqui. Ele sai do `genre` do jogo, que o front já tem — ver
 * `sectionLabel` em `game-section.model.ts`.
 */
@Injectable({ providedIn: 'root' })
export class GameSectionService {
  private readonly http = inject(HttpService);

  private api(gameId: number) {
    return this.http.resource(`games/${gameId}/sections`);
  }

  /** Já vem na ordem em que se atravessa o jogo, não na alfabética. */
  list(gameId: number): Observable<GameSection[]> {
    return this.api(gameId).get<GameSection[]>('');
  }

  create(gameId: number, payload: GameSectionPayload): Observable<GameSection> {
    return this.api(gameId).post<GameSection>('', payload);
  }

  update(gameId: number, id: number, payload: GameSectionPayload): Observable<GameSection> {
    return this.api(gameId).put<GameSection>(`${id}`, payload);
  }

  /**
   * Seção com conteúdo dentro responde 409, com a contagem na mensagem.
   *
   * Não é erro a tratar em silêncio: quem chamou precisa ver o texto, porque a saída é
   * mover o conteúdo, e só quem cadastrou sabe para onde.
   */
  delete(gameId: number, id: number): Observable<void> {
    return this.api(gameId).delete<void>(`${id}`);
  }
}
