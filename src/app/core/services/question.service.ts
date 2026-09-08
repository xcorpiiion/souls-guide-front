import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import type {
  GameAnswerDTO,
  GameAnswerRequest,
  GameQuestionDTO,
  GameQuestionRequest,
  GameQuestionSummaryDTO,
} from '@xcorpiiion/canonico';
import type { Page } from '../../shared/models/page.model';

/**
 * Pergunta e resposta por jogo. Ver ADR 0031 do souls-guide-api.
 *
 * <p>Duas bases, e não é descuido: a pergunta vive em `/questions` e a listagem de um jogo
 * em `/games/{id}/questions`. É como o back-end as expõe — a listagem pertence ao jogo, a
 * página da pergunta pertence a ela mesma, e é ela que o buscador indexa.
 */
@Injectable({ providedIn: 'root' })
export class QuestionService {
  private readonly perguntas = inject(HttpService).resource('questions');
  private readonly jogos = inject(HttpService).resource('games');
  private readonly respostas = inject(HttpService).resource('answers');

  /** Aceita id ou slug — o endpoint resolve os dois (ADR 0013). */
  get(referencia: string): Observable<GameQuestionDTO> {
    return this.perguntas.get<GameQuestionDTO>(`${referencia}`);
  }

  listByGame(
    gameId: string | number,
    page = 0,
    size = 10,
  ): Observable<Page<GameQuestionSummaryDTO>> {
    return this.jogos.get<Page<GameQuestionSummaryDTO>>(
      `${gameId}/questions?page=${page}&size=${size}`,
    );
  }

  ask(gameId: string | number, request: GameQuestionRequest): Observable<GameQuestionDTO> {
    return this.jogos.post<GameQuestionDTO>(`${gameId}/questions`, request);
  }

  answer(questionId: string | number, request: GameAnswerRequest): Observable<GameAnswerDTO> {
    return this.perguntas.post<GameAnswerDTO>(`${questionId}/answers`, request);
  }

  accept(questionId: string | number, answerId: string | number): Observable<void> {
    return this.perguntas.put<void>(`${questionId}/answers/${answerId}/accept`, {});
  }

  deleteQuestion(id: string | number): Observable<void> {
    return this.perguntas.delete<void>(`${id}`);
  }

  deleteAnswer(id: string | number): Observable<void> {
    return this.respostas.delete<void>(`${id}`);
  }
}
