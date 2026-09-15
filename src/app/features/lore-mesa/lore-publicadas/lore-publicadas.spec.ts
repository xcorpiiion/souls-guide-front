import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import { LorePublicadas } from './lore-publicadas';
import { LoreService } from '../../../core/services/lore.service';
import { LoreApi, loreApiToSummary } from '../../../shared/models/lore-article.model';

function lore(id: number, userId: string, content: string): LoreApi {
  return {
    id,
    slug: null,
    title: `Lore ${id}`,
    content,
    status: 'TEORIA',
    type: 'WORLD',
    userId,
    gameId: 53,
    gameName: 'Silent Hill f',
    items: [],
    isPersonal: false,
    isPublic: true,
    allowCopy: true,
    likeCount: 0,
    userHasLiked: false,
    followerCount: 0,
    userIsFollowing: false,
  } as LoreApi;
}

let service: { list: ReturnType<typeof vi.fn> };

function pagina(lores: LoreApi[], total = lores.length) {
  return of({ content: lores.map(loreApiToSummary), totalElements: total, totalPages: 1 });
}

function criar(): ComponentFixture<LorePublicadas> {
  TestBed.configureTestingModule({
    imports: [LorePublicadas],
    providers: [
      provideRouter([]),
      { provide: LoreService, useValue: service },
      { provide: AuthService, useValue: { isLoggedIn: signal(true), userId: signal('3') } },
    ],
  });
  const f = TestBed.createComponent(LorePublicadas);
  f.componentRef.setInput('jogoId', '53');
  f.componentRef.setInput('jogoNome', 'Silent Hill f');
  f.detectChanges();
  vi.advanceTimersByTime(250);
  f.detectChanges();
  return f;
}

function texto(f: ComponentFixture<LorePublicadas>): string {
  return (f.nativeElement as HTMLElement).textContent ?? '';
}

describe('LorePublicadas', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    service = {
      list: vi.fn(() =>
        pagina([
          lore(
            5,
            '3',
            '> Se você ler isto,\nnão volte pela ponte.\n— Bilhete · nota, Cap. 1\n\nO bilhete avisa.',
          ),
          lore(4, '2', 'Texto escrito à mão.'),
        ]),
      ),
    };
  });

  afterEach(() => vi.useRealTimers());

  it('filtra pelo id do jogo da mesa', () => {
    criar();
    expect(service.list).toHaveBeenCalledWith(0, 10, undefined, '53', undefined);
  });

  /** A lista mostrava "> Se você ler isto… — Bilhete…": o markdown cru da citação. */
  it('mostra o parágrafo escrito e a citação separada, sem o markdown', () => {
    const t = texto(criar());
    expect(t).toContain('O bilhete avisa.');
    expect(t).toContain('Se você ler isto, não volte pela ponte.');
    expect(t).toContain('— Bilhete · nota, Cap. 1');
    expect(t).not.toContain('>');
    expect(t).toContain('1 citação');
  });

  it('diz "sua" na lore de quem está lendo, e nunca mostra o id de ninguém', () => {
    const f = criar();
    const minhas = (f.nativeElement as HTMLElement).querySelectorAll('.lore__minha');
    expect(minhas).toHaveLength(1);
    expect(texto(f)).not.toContain('@2');
  });

  it('sem lore nenhuma, convida a montar a primeira', () => {
    service.list.mockReturnValue(pagina([]));
    const t = texto(criar());
    expect(t).toContain('ninguém publicou lore de Silent Hill f ainda');
    expect(t).toContain('montar a primeira');
  });

  it('"mostrar mais" pede a página seguinte e acrescenta', () => {
    service.list.mockReturnValue(pagina([lore(1, '2', 'um.')], 2));
    const f = criar();
    service.list.mockReturnValue(pagina([lore(2, '2', 'dois.')], 2));

    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.mais')!.click();
    vi.advanceTimersByTime(250);
    f.detectChanges();

    expect(service.list).toHaveBeenLastCalledWith(1, 10, undefined, '53', undefined);
    expect((f.nativeElement as HTMLElement).querySelectorAll('.lore')).toHaveLength(2);
  });
});
