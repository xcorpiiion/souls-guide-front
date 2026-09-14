import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import { ConfirmService, ToastService } from '@xcorpiiion/ui';
import type { StoryArchiveDTO, StoryFindingDTO, StoryLinkDTO } from '@xcorpiiion/canonico';
import { MeuArquivo } from './meu-arquivo';
import { StoryArchiveService } from '../../core/services/story-archive.service';

// Conteúdo fictício — o mesmo do artboard, para não dar spoiler de jogo nenhum.
function achado(id: number, title: string, chapter: string | null): StoryFindingDTO {
  return {
    id,
    gameId: 7,
    kind: 'NOTE',
    title,
    body: `\n${title}, primeira linha.\nsegunda linha.`,
    chapter,
    speaker: null,
    note: null,
    createdAt: '2026-09-13T20:00:00Z',
  };
}

const ACHADOS: StoryFindingDTO[] = [
  achado(1, 'Bilhete dobrado no armário', 'Cap. 1 — Escola'),
  achado(2, 'Diário da enfermaria', 'Cap. 2 — Hospital'),
  achado(3, 'Conversa com a mulher de branco', 'Cap. 2 — Hospital'),
  achado(4, 'O sino na praça', 'Cap. 3 — Vila'),
  achado(5, 'Página solta sem cabeçalho', null),
];

const LIGACOES: StoryLinkDTO[] = [
  { id: 10, fromId: 1, toId: 4, kind: 'HAPPENS_BEFORE', why: 'o bilhete avisa sobre o sino' },
  { id: 11, fromId: 2, toId: 3, kind: 'SAME_SUBJECT', why: null },
];

const ARQUIVO: StoryArchiveDTO = { gameId: 7, findings: ACHADOS, links: LIGACOES };

function criar(logado = true): ComponentFixture<MeuArquivo> {
  TestBed.configureTestingModule({
    imports: [MeuArquivo],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isLoggedIn: signal(logado), userId: signal('1') } },
      { provide: StoryArchiveService, useValue: { archive: vi.fn(() => of(ARQUIVO)) } },
      { provide: ConfirmService, useValue: { ask: vi.fn(() => of(false)) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(MeuArquivo);
  fixture.componentRef.setInput('gameId', '7');
  // A primeira passada roda o effect que pede o arquivo; a segunda desenha o que chegou.
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

describe('MeuArquivo', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('convida a entrar quem não está logado, sem pedir o arquivo', () => {
    const fixture = criar(false);
    const service = TestBed.inject(StoryArchiveService);

    expect(fixture.nativeElement.textContent).toContain('seu arquivo é só seu');
    expect(service.archive).not.toHaveBeenCalled();
  });

  it('conta achados, capítulos e peças soltas', () => {
    const fixture = criar();
    const valores = Array.from(
      fixture.nativeElement.querySelectorAll('.numeros__valor') as NodeListOf<HTMLElement>,
    ).map((v) => v.textContent?.trim());

    // Cinco achados; três capítulos (o sem capítulo não conta); só a página solta sem ligação.
    expect(valores).toEqual(['5', '3', '1']);
  });

  /**
   * "Sem capítulo" é o estado real de uma página solta, e fica no fim — um grupo próprio, e
   * não misturado a um capítulo nem escondido.
   */
  it('agrupa por capítulo na ordem em que foram registrados', () => {
    const fixture = criar();
    const grupos = fixture.componentInstance['grupos']().map((g) => g.chapter);

    expect(grupos).toEqual([
      'Cap. 1 — Escola',
      'Cap. 2 — Hospital',
      'Cap. 3 — Vila',
      'sem capítulo',
    ]);
  });

  it('o trecho da linha é a primeira linha com texto, e não a quebra do começo', () => {
    const fixture = criar();
    const primeiro = fixture.componentInstance['itens']()[0];

    expect(primeiro.firstLine).toBe('Bilhete dobrado no armário, primeira linha.');
  });

  /**
   * A ligação é gravada numa direção só. Sem a inversão, o sino diria que acontece ANTES do
   * bilhete, e o bilhete que acontece antes do sino — os dois vindo antes um do outro.
   */
  it('"acontece antes" lida a partir do destino vira "acontece depois"', () => {
    const fixture = criar();
    const c = fixture.componentInstance;

    c['abrirAchado'](1);
    expect(c['ligacoesDoDetalhe']()[0].label).toBe('acontece antes');

    c['abrirAchado'](4);
    expect(c['ligacoesDoDetalhe']()[0].label).toBe('acontece depois');
  });

  it('o mural só desenha quem tem ligação, e cada capítulo vira uma coluna', () => {
    const fixture = criar();
    const nos = fixture.componentInstance['nos']();

    expect(nos.map((n) => n.id)).toEqual([1, 2, 3, 4]);
    const x = new Map(nos.map((n) => [n.id, n.x]));
    expect(x.get(2)).toBe(x.get(3));
    expect(x.get(1)).toBeLessThan(x.get(2)!);
    expect(x.get(2)).toBeLessThan(x.get(4)!);
  });

  it('acender um achado apaga quem não é vizinho dele', () => {
    const fixture = criar();
    const c = fixture.componentInstance;

    c['alternarDestaque'](2);
    const apagados = c['nos']()
      .filter((n) => n.apagado)
      .map((n) => n.id);

    expect(apagados).toEqual([1, 4]);
  });

  it('o registro novo vem com o último capítulo usado', () => {
    const fixture = criar();
    const c = fixture.componentInstance;

    c['irParaRegistrar']();

    // O último achado não tem capítulo; o último capítulo USADO é o da vila.
    expect(c['formCapitulo']()).toBe('Cap. 3 — Vila');
  });
});
