import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import type { StoryFindingDTO, StoryLinkDTO } from '@xcorpiiion/canonico';
import { ArquivoMural } from './arquivo-mural';
import { decorar } from '../arquivo.model';

function achado(id: number, chapter: string | null): StoryFindingDTO {
  return {
    id,
    gameId: 7,
    kind: 'NOTE',
    title: `achado ${id}`,
    body: 'texto',
    chapter,
    speaker: null,
    note: null,
    createdAt: '2026-09-13T20:00:00Z',
  };
}

const ACHADOS = [
  achado(1, 'Cap. 1'),
  achado(2, 'Cap. 2'),
  achado(3, 'Cap. 2'),
  achado(4, 'Cap. 3'),
  achado(5, 'Cap. 3'),
];

const LIGACOES: StoryLinkDTO[] = [
  { id: 10, fromId: 1, toId: 3, kind: 'SAME_SUBJECT', why: null },
  { id: 11, fromId: 2, toId: 3, kind: 'CONTRADICTS', why: null },
];

function criar(): ComponentFixture<ArquivoMural> {
  TestBed.configureTestingModule({ imports: [ArquivoMural] });
  const fixture = TestBed.createComponent(ArquivoMural);
  fixture.componentRef.setInput('itens', decorar(ACHADOS, LIGACOES));
  fixture.componentRef.setInput('ligacoes', LIGACOES);
  fixture.detectChanges();
  return fixture;
}

describe('ArquivoMural', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('só desenha quem tem ligação; as soltas descem para a bandeja', () => {
    const c = criar().componentInstance;

    expect(c['nos']().map((n) => n.id)).toEqual([1, 2, 3]);
    expect(c['soltas']().map((s) => s.id)).toEqual([4, 5]);
  });

  /**
   * O arco entre achados da mesma coluna sai e volta pela direita: uma reta entre eles
   * passaria por cima dos cartões do meio.
   */
  it('arco na mesma coluna contorna pela direita, e o rótulo fica fora dos cartões', () => {
    const c = criar().componentInstance;
    const noDois = c['nos']().find((n) => n.id === 2)!;
    const arcoDentroDaColuna = c['arcos']().find((a) => a.id === 11)!;

    expect(arcoDentroDaColuna.meio.x).toBeGreaterThan(noDois.x + 230);
    expect(arcoDentroDaColuna.tracejado).toBe('5 4');
  });

  it('acender um achado deixa o vizinho por "contradiz" em brasa e apaga quem não é vizinho', () => {
    const c = criar().componentInstance;
    c['alternarDestaque'](3);

    const nos = new Map(c['nos']().map((n) => [n.id, n]));
    expect(nos.get(2)!.emBrasa).toBe(true);
    expect(nos.get(1)!.emBrasa).toBe(false);
    expect([...nos.values()].some((n) => n.apagado)).toBe(false);

    c['alternarDestaque'](1);
    expect(new Map(c['nos']().map((n) => [n.id, n])).get(2)!.apagado).toBe(true);
  });
});
