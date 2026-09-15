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
import { PersonalLoreService } from '../../core/services/personal-lore.service';
import { LoreService } from '../../core/services/lore.service';

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
      { provide: PersonalLoreService, useValue: { listByUser: vi.fn(() => of([])) } },
      { provide: LoreService, useValue: { list: vi.fn() } },
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

  /** A parte de ler: a mesa do perfil tem as mesmas duas abas da mesa da lore. */
  it('a aba "minhas lores" mostra a lista de leitura do perfil', () => {
    vi.useFakeTimers();
    const f = criar({ jogo: 'silent-hill-f', aba: 'lores' });
    vi.advanceTimersByTime(250);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('app-lore-publicadas')).not.toBeNull();
    expect(el.querySelector('app-meu-arquivo')).toBeNull();
    expect(el.textContent).toContain('você ainda não montou lore de Silent Hill f no perfil');
    vi.useRealTimers();
  });

  it('sem jogo na URL, pergunta o jogo', () => {
    const f = criar({});
    expect((f.nativeElement as HTMLElement).querySelector('app-escolher-jogo')).not.toBeNull();
    expect(arquivo.archive).not.toHaveBeenCalled();
  });
});
