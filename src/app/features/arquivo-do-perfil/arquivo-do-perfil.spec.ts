import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import { ConfirmService, ToastService } from '@xcorpiiion/ui';
import type { GameDTO } from '@xcorpiiion/canonico';
import { ArquivoDoPerfil } from './arquivo-do-perfil';
import { GameService } from '../../core/services/game.service';
import { StoryArchiveService } from '../../core/services/story-archive.service';

const JOGO = {
  id: 53,
  slug: 'silent-hill-f',
  name: 'Silent Hill f',
  shortName: 'SHf',
  dentroDoEscopo: true,
} as unknown as GameDTO;

let arquivo: { archive: ReturnType<typeof vi.fn> };

function criar(params: Record<string, string>): ComponentFixture<ArquivoDoPerfil> {
  arquivo = {
    archive: vi.fn(() =>
      of({ gameId: 53, space: 'PROFILE', findings: [], links: [], characters: [] }),
    ),
  };
  TestBed.configureTestingModule({
    imports: [ArquivoDoPerfil],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: new BehaviorSubject(convertToParamMap(params)) },
      },
      {
        provide: GameService,
        useValue: { get: vi.fn(() => of(JOGO)), list: vi.fn(() => of({ content: [] })) },
      },
      { provide: StoryArchiveService, useValue: arquivo },
      { provide: AuthService, useValue: { isLoggedIn: signal(true), userId: signal('3') } },
      { provide: ConfirmService, useValue: { ask: vi.fn(() => of(false)) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  });
  const f = TestBed.createComponent(ArquivoDoPerfil);
  f.detectChanges();
  f.detectChanges();
  return f;
}

describe('ArquivoDoPerfil', () => {
  beforeEach(() => TestBed.resetTestingModule());

  /** O bug: pela lore do perfil não havia onde registrar nota — e o arquivo era o da lore. */
  it('abre a mesa inteira sobre o arquivo do perfil, e não o da lore', () => {
    const f = criar({ jogo: 'silent-hill-f' });
    const el = f.nativeElement as HTMLElement;
    expect(arquivo.archive).toHaveBeenCalledWith('53', 'PROFILE');
    expect(el.querySelector('app-meu-arquivo')).not.toBeNull();
    expect(el.textContent).toContain('arquivo do perfil, só seu');
    expect(el.querySelector('a[href="/profile"]')).not.toBeNull();
  });

  it('sem jogo na URL, pergunta o jogo', () => {
    const f = criar({});
    expect((f.nativeElement as HTMLElement).querySelector('app-escolher-jogo')).not.toBeNull();
    expect(arquivo.archive).not.toHaveBeenCalled();
  });
});
