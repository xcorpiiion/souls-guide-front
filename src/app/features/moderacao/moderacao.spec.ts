import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import type { ContentReportDTO } from '@xcorpiiion/canonico';
import { ToastService } from '@xcorpiiion/ui';
import { Moderacao } from './moderacao';
import { ModeracaoService } from '../../core/services/moderacao.service';

const ABERTA: ContentReportDTO = {
  id: 1,
  contentKind: 'LORE',
  contentId: 20,
  contentTitle: 'A Árvore Áurea',
  contentGone: false,
  reason: 'SPOILER_SEM_AVISO',
  details: 'entrega o final logo no primeiro parágrafo',
  reporterId: '42',
  reportedUserId: '7',
  status: 'OPEN',
  note: null,
  createdAt: '2026-08-18T10:00:00Z',
  resolvedAt: null,
  resolvedBy: null,
};

const TOAST = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), show: vi.fn() };

function montar(denuncias: ContentReportDTO[] = [ABERTA]) {
  const fila = vi.fn(() =>
    of({
      content: denuncias,
      totalElements: denuncias.length,
      totalPages: 1,
      pageNumber: 0,
      pageSize: 20,
      first: true,
      last: true,
    }),
  );
  const resolver = vi.fn(() => of(ABERTA));

  TestBed.configureTestingModule({
    imports: [Moderacao],
    providers: [
      provideRouter([]),
      { provide: ModeracaoService, useValue: { fila, resolver } },
      { provide: ToastService, useValue: TOAST },
    ],
  });

  const fixture = TestBed.createComponent(Moderacao);
  fixture.detectChanges();
  return { fixture, fila, resolver };
}

const texto = (f: ComponentFixture<Moderacao>) =>
  (f.nativeElement as HTMLElement).textContent ?? '';

describe('Moderacao', () => {
  it('mostra a fila com o conteúdo, o motivo e o que a pessoa escreveu', () => {
    const { fixture } = montar();

    expect(texto(fixture)).toContain('A Árvore Áurea');
    expect(texto(fixture)).toContain('spoiler sem aviso');
    expect(texto(fixture)).toContain('entrega o final logo no primeiro parágrafo');
  });

  it('abre a fila em abertas', () => {
    const { fila } = montar();

    expect(fila).toHaveBeenCalledWith('OPEN');
  });

  it('troca de aba recarregando a fila', () => {
    const { fixture, fila } = montar();
    const tela = fixture.componentInstance as unknown as { trocarAba: (s: string) => void };

    tela.trocarAba('RESOLVED');

    expect(fila).toHaveBeenLastCalledWith('RESOLVED');
  });

  /** O strike é decisão à parte, e a tela precisa deixar isso explícito. */
  it('resolve sem strike por padrão', () => {
    const { fixture, resolver } = montar();
    const tela = fixture.componentInstance as unknown as {
      abrirDecisao: (id: number) => void;
      decidir: (id: number, s: string) => void;
    };

    tela.abrirDecisao(1);
    tela.decidir(1, 'RESOLVED');

    expect(resolver).toHaveBeenCalledWith(1, expect.objectContaining({ applyStrike: false }));
  });

  it('marca conteúdo já removido, sem link', () => {
    const { fixture } = montar([{ ...ABERTA, contentGone: true, contentTitle: null }]);

    expect(texto(fixture)).toContain('conteúdo removido');
    expect((fixture.nativeElement as HTMLElement).querySelector('a.mod__conteudo')).toBeNull();
  });

  it('avisa quando não há nada na fila', () => {
    const { fixture } = montar([]);

    expect(texto(fixture)).toContain('nada na fila');
  });
});
