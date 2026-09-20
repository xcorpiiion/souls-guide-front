import { inject, Injectable } from '@angular/core';
import { HttpService } from '@xcorpiiion/ng-core';
import { Observable } from 'rxjs';
import type {
  StoryArchiveDTO,
  StoryArchiveSpace,
  StoryCharacterDTO,
  StoryCharacterRequest,
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
 * <p><b>Dois arquivos por pessoa</b> (ADR 0035): o da mesa de `/lore` (`COMMUNITY`) e o do
 * perfil (`PROFILE`), sem nada em comum. Ler e criar dizem qual; editar, ligar e excluir seguem o
 * arquivo em que o registro já está.
 *
 * <p>O arquivo vem inteiro em `archive`, sem paginação — a tela conta, filtra e liga em cima do
 * conjunto todo.
 */
@Injectable({ providedIn: 'root' })
export class StoryArchiveService {
  private readonly jogos = inject(HttpService).resource('games');
  private readonly achados = inject(HttpService).resource('findings');
  private readonly ligacoes = inject(HttpService).resource('story-links');
  private readonly elenco = inject(HttpService).resource('story-characters');

  archive(
    gameId: string | number,
    space: StoryArchiveSpace = 'COMMUNITY',
  ): Observable<StoryArchiveDTO> {
    return this.jogos.get<StoryArchiveDTO>(`${gameId}/archive`, { space });
  }

  register(
    gameId: string | number,
    request: StoryFindingRequest,
    space: StoryArchiveSpace = 'COMMUNITY',
  ): Observable<StoryFindingDTO> {
    return this.jogos.post<StoryFindingDTO>(`${gameId}/findings`, request, { space });
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

  // ─── Elenco (ADR 0033 do souls-guide-api) ─────────────────────────────────

  addCharacter(
    gameId: string | number,
    request: StoryCharacterRequest,
    space: StoryArchiveSpace = 'COMMUNITY',
  ): Observable<StoryCharacterDTO> {
    return this.jogos.post<StoryCharacterDTO>(`${gameId}/characters`, request, { space });
  }

  updateCharacter(id: number, request: StoryCharacterRequest): Observable<StoryCharacterDTO> {
    return this.elenco.put<StoryCharacterDTO>(`${id}`, request);
  }

  /** Os achados em que ele aparece continuam; a fala fica com o nome como rótulo. */
  removeCharacter(id: number): Observable<void> {
    return this.elenco.delete<void>(`${id}`);
  }
}
