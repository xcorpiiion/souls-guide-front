import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ToastService } from '@xcorpiiion/ui';
import type { GameDTO, StoryArchiveDTO } from '@xcorpiiion/canonico';
import { LoreNova } from './lore-nova';
import { GameService } from '../../core/services/game.service';
import { StoryArchiveService } from '../../core/services/story-archive.service';
import { LoreService } from '../../core/services/lore.service';
import { PersonalLoreService } from '../../core/services/personal-lore.service';

const JOGO = {
  id: 7,
  slug: 'silent-hill-2',
  name: 'Silent Hill 2',
  shortName: 'SH2',
  dentroDoEscopo: true,
} as unknown as GameDTO;

const ARQUIVO: StoryArchiveDTO = {
  gameId: 7,
  findings: [
    {
      id: 1,
      gameId: 7,
      kind: 'NOTE',
      title: 'Bilhete dobrado no armário',
      body: 'Se você ler isto, não volte pela ponte.',
      chapter: 'Cap. 1 — Escola',
      speaker: null,
      note: null,
      createdAt: '2026-09-13T20:00:00Z',
    },
  ],
  links: [],
};

let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
let games: { get: ReturnType<typeof vi.fn>; search: ReturnType<typeof vi.fn> };
let arquivo: { archive: ReturnType<typeof vi.fn> };

function criar(params: Record<string, string> = {}): ComponentFixture<LoreNova> {
  query = new BehaviorSubject(convertToParamMap(params));
  TestBed.configureTestingModule({
    imports: [LoreNova],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          queryParamMap: query,
          get snapshot() {
            return { queryParamMap: query.value };
          },
        },
      },
      { provide: GameService, useValue: games },
      { provide: StoryArchiveService, useValue: arquivo },
      { provide: LoreService, useValue: { create: vi.fn() } },
      { provide: PersonalLoreService, useValue: { createPersonal: vi.fn() } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LoreNova);
  fixture.detectChanges();
  return fixture;
}

function texto(f: ComponentFixture<LoreNova>): string {
  return (f.nativeElement as HTMLElement).textContent ?? '';
}

describe('LoreNova', () => {
  beforeEach(() => {
    games = {
      get: vi.fn(() => of(JOGO)),
      search: vi.fn(() =>
        of([{ id: '7', ref: 'silent-hill-2', name: 'Silent Hill 2', shortName: 'SH2' }]),
      ),
    };
    arquivo = { archive: vi.fn(() => of(ARQUIVO)) };
  });

  afterEach(() => vi.useRealTimers());

  it('sem jogo na URL, pergunta o jogo antes de tudo', () => {
    const f = criar();
    expect(texto(f)).toContain('primeiro, de qual jogo?');
    expect(arquivo.archive).not.toHaveBeenCalled();
  });

  it('escolher um jogo grava na URL, para recarregar não voltar à busca', () => {
    vi.useFakeTimers();
    const f = criar();
    const campo = (f.nativeElement as HTMLElement).querySelector('input')!;
    campo.value = 'silent';
    campo.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    f.detectChanges();

    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.nova__jogo')!.click();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([], {
      queryParams: { jogo: '7' },
    });
  });

  it('com o jogo na URL, abre o montar lore com o arquivo dele', () => {
    const f = criar({ jogo: '7' });
    expect(arquivo.archive).toHaveBeenCalledWith('7');
    expect(f.nativeElement.querySelector('app-montar-lore')).not.toBeNull();
    expect(texto(f)).toContain('Bilhete dobrado no armário');
  });

  it('arquivo vazio manda registrar achado na aba do jogo, sem abrir página em branco', () => {
    arquivo.archive.mockReturnValue(of({ gameId: 7, findings: [], links: [] }));
    const f = criar({ jogo: '7' });
    expect(f.nativeElement.querySelector('app-montar-lore')).toBeNull();
    const link = (f.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.estado a.botao',
    )!;
    expect(link.getAttribute('href')).toBe('/games/silent-hill-2?aba=arquivo');
  });

  it('jogo fora do escopo não pergunta pelo arquivo', () => {
    games.get.mockReturnValue(of({ ...JOGO, dentroDoEscopo: false }));
    const f = criar({ jogo: '7' });
    expect(arquivo.archive).not.toHaveBeenCalled();
    expect(texto(f)).toContain('não tem guias aqui');
  });

  it('409 do servidor também é fora do escopo, não erro', () => {
    arquivo.archive.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const f = criar({ jogo: '7' });
    expect(texto(f)).toContain('não tem guias aqui');
  });

  it('jogo inexistente na URL volta para a escolha', () => {
    games.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const f = criar({ jogo: '999' });
    expect(texto(f)).toContain('primeiro, de qual jogo?');
  });

  it('falha do servidor oferece tentar de novo', () => {
    arquivo.archive.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    const f = criar({ jogo: '7' });
    expect(texto(f)).toContain('o arquivo não abriu');

    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.estado button')!.click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('app-montar-lore')).not.toBeNull();
  });
});
