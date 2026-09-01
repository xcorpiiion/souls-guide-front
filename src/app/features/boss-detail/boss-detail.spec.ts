import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { BossDTO, BossProgressResponse } from '@xcorpiiion/canonico';
import { AuthService } from '@xcorpiiion/ng-core';
import { BossDetail } from './boss-detail';
import { BossService } from '../../core/services/boss.service';
import { StorageService } from '../../core/services/storage.service';

const BOSS: BossDTO = {
  id: 3,
  name: 'Malenia',
  gameId: 1,
  gameName: 'Elden Ring',
  location: 'Haligtree, no fundo',
  mandatory: false,
  displayOrder: 1,
  section: null,
  lore: 'A Lâmina de Miquella.',
  weaknesses: ['sangramento'],
  whatWorks: 'Escudo com bloqueio total',
  whatFails: 'Trocar golpe na Dança da Água',
  phases: [],
  drops: [],
  guides: [],
  imageFileKey: null,
  viewerHasDefeated: false,
};

const STORAGE = { previewUrl: (k: string) => `/storage-api/files/${k}/preview` };

const PROGRESSO: BossProgressResponse = { defeatedBossIds: [3], total: 10, defeated: 1 };

function montar(
  resposta: unknown,
  bossService: Record<string, unknown> = {},
  logado = true,
): ComponentFixture<BossDetail> {
  const servico = { get: () => resposta, ...bossService };

  TestBed.configureTestingModule({
    imports: [BossDetail],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '3' }) } },
      },
      { provide: BossService, useValue: servico },
      { provide: StorageService, useValue: STORAGE },
      { provide: AuthService, useValue: { isLoggedIn: () => logado } },
    ],
  });

  const fixture = TestBed.createComponent(BossDetail);
  fixture.detectChanges();
  return fixture;
}

const texto = (f: ComponentFixture<BossDetail>) =>
  (f.nativeElement as HTMLElement).textContent ?? '';

describe('BossDetail', () => {
  it('mostra o chefe, onde fica e o que funciona', () => {
    const fixture = montar(of(BOSS));

    expect(texto(fixture)).toContain('Malenia');
    expect(texto(fixture)).toContain('Haligtree, no fundo');
    expect(texto(fixture)).toContain('Escudo com bloqueio total');
  });

  /**
   * O 404 tem recado próprio porque a página é indexada: quem chega pelo Google num
   * chefe que saiu do ar precisa saber que ele não existe, não que "algo deu errado".
   *
   * Este é também o caso que quebra ao aliasar `recurso.value` sem `hasValue()` —
   * `value()` lança em erro, e a tela de erro morre antes de aparecer.
   */
  it('diz que o chefe não existe no 404, em vez de falha genérica', () => {
    const fixture = montar(throwError(() => ({ status: 404 })));

    expect(texto(fixture)).toContain('Chefe não encontrado');
  });

  it('no erro de servidor o recado é o genérico', () => {
    const fixture = montar(throwError(() => ({ status: 500 })));

    expect(texto(fixture)).toContain('Não foi possível carregar');
  });

  it('a lore nasce recolhida e o botão abre', () => {
    const fixture = montar(of(BOSS));
    expect(texto(fixture)).not.toContain('A Lâmina de Miquella');

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.chefe__lore-toggle')!
      .click();
    fixture.detectChanges();

    expect(texto(fixture)).toContain('A Lâmina de Miquella');
  });

  describe('marcar como derrotado', () => {
    /**
     * A marca aparece antes de o servidor confirmar — quem clicou não deve esperar uma
     * ida e volta para ver o próprio clique. O recurso do `rxResource` é gravável, e é
     * por ele que a troca local passa.
     */
    it('marca antes da confirmação do servidor', () => {
      const marcarDerrotado = vi.fn(() => of(PROGRESSO));
      const fixture = montar(of(BOSS), { marcarDerrotado });

      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('.chefe__marcar')!
        .click();
      fixture.detectChanges();

      expect(texto(fixture)).toContain('você derrotou este chefe');
      expect(marcarDerrotado).toHaveBeenCalledWith(3);
    });

    it('desfaz a marca quando o servidor recusa', () => {
      const marcarDerrotado = vi.fn(() => throwError(() => ({ status: 500 })));
      const fixture = montar(of(BOSS), { marcarDerrotado });

      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('.chefe__marcar')!
        .click();
      fixture.detectChanges();

      expect(texto(fixture)).toContain('marcar como derrotado');
      expect(texto(fixture)).not.toContain('você derrotou este chefe');
    });

    it('deslogado não vê o botão', () => {
      const fixture = montar(of(BOSS), {}, false);

      expect((fixture.nativeElement as HTMLElement).querySelector('.chefe__marcar')).toBeNull();
    });
  });
});
