import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import { LorePublicadas } from './lore-publicadas';
import { LoreService } from '../../../core/services/lore.service';
import { PersonalLoreService } from '../../../core/services/personal-lore.service';
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
let pessoal: { listByUser: ReturnType<typeof vi.fn> };

function pagina(lores: LoreApi[], total = lores.length) {
  return of({ content: lores.map(loreApiToSummary), totalElements: total, totalPages: 1 });
}

function criar(origem: 'comunidade' | 'perfil' = 'comunidade'): ComponentFixture<LorePublicadas> {
  TestBed.configureTestingModule({
    imports: [LorePublicadas],
    providers: [
      provideRouter([]),
      { provide: LoreService, useValue: service },
      { provide: PersonalLoreService, useValue: pessoal },
      { provide: AuthService, useValue: { isLoggedIn: signal(true), userId: signal('3') } },
    ],
  });
  const f = TestBed.createComponent(LorePublicadas);
  f.componentRef.setInput('jogoId', '53');
  f.componentRef.setInput('jogoNome', 'Silent Hill f');
  f.componentRef.setInput('origem', origem);
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

  /** ADR 0012: a mesa do perfil lê as lores só da pessoa, com o mesmo desenho. */
  describe('no perfil', () => {
    beforeEach(() => {
      const minha = (id: number, jogo: number, publica: boolean) => ({
        ...loreApiToSummary(
          lore(id, '3', '> JAMES: Mary?\n— Ponte · diálogo, Cap. 2 · com James\n\ntexto.'),
        ),
        gameId: String(jogo),
        isPersonal: true,
        isPublic: publica,
      });
      pessoal = {
        listByUser: vi.fn(() => of([minha(7, 53, false), minha(8, 53, true), minha(9, 12, false)])),
      };
    });

    it('mostra só as lores do perfil daquele jogo, e abre pelo perfil', () => {
      const f = criar('perfil');
      const el = f.nativeElement as HTMLElement;
      expect(service.list).not.toHaveBeenCalled();
      expect(pessoal.listByUser).toHaveBeenCalledWith('3');
      const links = Array.from(el.querySelectorAll('a.lore')).map((a) => a.getAttribute('href'));
      expect(links).toEqual(['/profile/lore/7', '/profile/lore/8']);
      expect(texto(f)).toContain('só você');
      expect(texto(f)).toContain('2 lores suas');
      expect(el.querySelector('a.montar')?.getAttribute('href')).toBe('/profile/lore/new?jogo=53');
    });
  });

  it('filtra pelo id do jogo da mesa', () => {
    criar();
    expect(service.list).toHaveBeenCalledWith(0, 10, undefined, '53');
  });

  /** "Do mundo / de personagem" era marcado à mão; quem a lore cita sai das citações. */
  it('"sobre quem" lista quem as lores citam, e filtra por essa pessoa', () => {
    service.list.mockReturnValue(
      pagina([
        lore(1, '2', '> JAMES: Mary?\n— Ponte · diálogo, Cap. 2 · com James, Laura\n\num.'),
        lore(2, '2', '> Dia 3.\n— Diário · documento, Cap. 1 · por Laura\n\ndois.'),
      ]),
    );
    const f = criar();
    const el = f.nativeElement as HTMLElement;
    const chips = Array.from(el.querySelectorAll<HTMLButtonElement>('.categoria'));
    expect(chips.map((c) => c.textContent?.trim())).toEqual(['todas', 'Laura', 'James']);
    expect(texto(f)).toContain('cita James, Laura');
    expect(texto(f)).toContain('diálogo');

    chips.find((c) => c.textContent?.trim() === 'James')!.click();
    f.detectChanges();
    expect(el.querySelectorAll('.lore')).toHaveLength(1);
    expect(texto(f)).toContain('Lore 1');
  });

  /** A lista mostrava "> Se você ler isto… — Bilhete…": o markdown cru da citação. */
  it('mostra o parágrafo escrito e a citação separada, sem o markdown', () => {
    const t = texto(criar());
    expect(t).toContain('O bilhete avisa.');
    expect(t).toContain('Se você ler isto, não volte pela ponte.');
    expect(t).toContain('— Bilhete');
    expect(t).toContain('nota');
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

    expect(service.list).toHaveBeenLastCalledWith(1, 10, undefined, '53');
    expect((f.nativeElement as HTMLElement).querySelectorAll('.lore')).toHaveLength(2);
  });
});
