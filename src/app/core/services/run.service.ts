import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import type { RunOverviewDTO } from '@xcorpiiion/canonico';

/**
 * O painel da run: onde o jogador está num jogo, e o que ele precisa saber agora.
 *
 * Uma chamada só, de propósito. O dado vem de três lugares no back-end — progresso de
 * quest, progresso de final e as condições entre quests —, e montar isso aqui seria uma
 * requisição por quest e uma por final, numa tela que existe justamente para mostrar tudo
 * de uma vez.
 */
@Injectable({ providedIn: 'root' })
export class RunService {
  private readonly api = inject(HttpService).resource('');

  overview(gameId: string): Observable<RunOverviewDTO> {
    return this.api.get<RunOverviewDTO>(`games/${gameId}/run`);
  }
}
