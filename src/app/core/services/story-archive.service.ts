import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import type {
  StoryArchiveDTO,
  StoryFindingDTO,
  StoryFindingNoteRequest,
  StoryFindingRequest,
  StoryLinkDTO,
  StoryLinkRequest,
} from '@xcorpiiion/canonico';

/**
 * O arquivo pessoal de achados de um jogo. Ver ADR 0032 do souls-guide-api.
 *
 * <p>Toda rota exige login, inclusive a leitura: o arquivo só existe para quem o escreveu, e
 * o servidor responde 404 para achado de outra pessoa.
 *
 * <p>O arquivo vem inteiro em `archive`, sem paginação — a tela conta, filtra e desenha o
 * mural em cima do conjunto todo.
 */
@Injectable({ providedIn: 'root' })
export class StoryArchiveService {
  private readonly jogos = inject(HttpService).resource('games');
  private readonly achados = inject(HttpService).resource('findings');
  private readonly ligacoes = inject(HttpService).resource('story-links');

  archive(gameId: string | number): Observable<StoryArchiveDTO> {
    return this.jogos.get<StoryArchiveDTO>(`${gameId}/archive`);
  }

  register(gameId: string | number, request: StoryFindingRequest): Observable<StoryFindingDTO> {
    return this.jogos.post<StoryFindingDTO>(`${gameId}/findings`, request);
  }

  update(id: number, request: StoryFindingRequest): Observable<StoryFindingDTO> {
    return this.achados.put<StoryFindingDTO>(`${id}`, request);
  }

  saveNote(id: number, request: StoryFindingNoteRequest): Observable<StoryFindingDTO> {
    return this.achados.put<StoryFindingDTO>(`${id}/note`, request);
  }

  delete(id: number): Observable<void> {
    return this.achados.delete<void>(`${id}`);
  }

  link(fromId: number, request: StoryLinkRequest): Observable<StoryLinkDTO> {
    return this.achados.post<StoryLinkDTO>(`${fromId}/links`, request);
  }

  unlink(linkId: number): Observable<void> {
    return this.ligacoes.delete<void>(`${linkId}`);
  }
}
