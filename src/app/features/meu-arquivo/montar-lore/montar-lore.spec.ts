import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { ToastService } from '@xcorpiiion/ui';
import type { StoryFindingDTO, StoryLinkDTO } from '@xcorpiiion/canonico';
import { MontarLore } from './montar-lore';
import { LoreService } from '../../../core/services/lore.service';
import { PersonalLoreService } from '../../../core/services/personal-lore.service';
import { decorar } from '../arquivo.model';

const ACHADOS: StoryFindingDTO[] = [
  {
    id: 1,
    gameId: 7,
    kind: 'NOTE',
    title: 'Bilhete dobrado no armário',
    body: 'Se você ler isto,\n\nnão volte pela ponte.',
    chapter: 'Cap. 1 — Escola',
    speaker: null,
    note: 'minha anotação secreta',
    createdAt: '2026-09-13T20:00:00Z',
  },
  {
    id: 2,
    gameId: 7,
    kind: 'CUTSCENE',
    title: 'O sino na praça',
    body: 'A corda do sino ainda balança.',
    chapter: null,
    speaker: null,
    note: null,
    createdAt: '2026-09-13T20:01:00Z',
  },
];

const LIGACOES: StoryLinkDTO[] = [
  { id: 10, fromId: 2, toId: 1, kind: 'HAPPENS_BEFORE', why: null },
];

let loreService: { create: ReturnType<typeof vi.fn> };
let personalLoreService: { createPersonal: ReturnType<typeof vi.fn> };

function criar(): ComponentFixture<MontarLore> {
  loreService = { create: vi.fn(() => of({ id: 55 })) };
  personalLoreService = { createPersonal: vi.fn(() => of({ id: 56 })) };
  TestBed.configureTestingModule({
    imports: [MontarLore],
    providers: [
      provideRouter([]),
      { provide: LoreService, useValue: loreService },
      { provide: PersonalLoreService, useValue: personalLoreService },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  });
  // Publicar navega para o artigo; aqui só importa o que foi mandado ao servidor.
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(MontarLore);
  fixture.componentRef.setInput('gameId', '7');
  fixture.componentRef.setInput('gameName', 'Silent Hill 2');
  fixture.componentRef.setInput('itens', decorar(ACHADOS, LIGACOES));
  fixture.componentRef.setInput('ligacoes', LIGACOES);
  fixture.detectChanges();
  return fixture;
}

describe('MontarLore', () => {
  beforeEach(() => TestBed.resetTestingModule());

  /**
   * Entre os vizinhos da ordem aparece a ligação que já existe — e lida de cima para baixo.
   * O sino acontece antes do bilhete; com o bilhete em cima, a linha entre os dois diz
   * "acontece depois".
   */
  it('mostra a ligação entre vizinhos no sentido da leitura', () => {
    const c = criar().componentInstance;
    c['alternar'](1);
    c['alternar'](2);

    expect(c['entreVizinhos']()).toEqual([{ rotulo: 'acontece depois', kind: 'HAPPENS_BEFORE' }]);

    c['mover'](0, 1);
    expect(c['entreVizinhos']()).toEqual([{ rotulo: 'acontece antes', kind: 'HAPPENS_BEFORE' }]);
  });

  it('a escrita nasce com as citações na ordem do fio, e publica o texto do achado sem a anotação', () => {
    const c = criar().componentInstance;
    c['alternar'](1);
    c['alternar'](2);
    c['irPara'](3);

    const primeiroTexto = c['blocos']().find((b) => b.kind === 'texto')!;
    c['escrever'](primeiroTexto.id, 'Três coisas não fecham.');
    c['titulo'].set('Quem está tocando o sino');

    c['publicar']();

    const enviado = loreService.create.mock.calls[0][0];
    expect(enviado).toEqual(
      expect.objectContaining({ title: 'Quem está tocando o sino', type: 'WORLD', gameId: '7' }),
    );
    // A linha em branco de dentro do achado vira quebra simples: senão partiria a citação.
    expect(enviado.content).toContain(
      '> Se você ler isto,\nnão volte pela ponte.\n— Bilhete dobrado no armário · nota, Cap. 1 — Escola',
    );
    expect(enviado.content).toContain('— O sino na praça · cutscene, sem capítulo');
    expect(enviado.content.startsWith('Três coisas não fecham.')).toBe(true);
    expect(enviado.content).not.toContain('minha anotação secreta');
  });

  it('tirar uma citação a devolve às restantes, e junta os parágrafos que ficaram colados', () => {
    const c = criar().componentInstance;
    c['alternar'](1);
    c['irPara'](3);

    const [antes, citacao, depois] = c['blocos']();
    c['escrever'](antes.id, 'antes');
    c['escrever'](depois.id, 'depois');
    c['removerCitacao'](citacao.id);

    expect(c['restantes']().map((a) => a.id)).toEqual([1]);
    expect(c['blocos']()).toEqual([
      expect.objectContaining({ kind: 'texto', valor: 'antes\n\ndepois' }),
    ]);
  });

  it('guardar rascunho cria uma lore pessoal e privada', () => {
    const c = criar().componentInstance;
    c['alternar'](2);
    c['irPara'](3);
    c['titulo'].set('Rascunho do sino');

    c['guardarRascunho']();

    expect(personalLoreService.createPersonal).toHaveBeenCalledWith(
      expect.objectContaining({ isPublic: false, allowCopy: false, title: 'Rascunho do sino' }),
    );
  });
});
