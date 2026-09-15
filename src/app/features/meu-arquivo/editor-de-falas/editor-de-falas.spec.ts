import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import type { StoryCharacterDTO } from '@xcorpiiion/canonico';
import { EditorDeFalas, FalaDoForm, novaFala } from './editor-de-falas';

const ELENCO: StoryCharacterDTO[] = [
  {
    id: 1,
    gameId: 7,
    kind: 'CHARACTER',
    name: 'Mulher de branco',
    description: null,
    bossId: null,
  },
];

function criar(falas: FalaDoForm[] = []): ComponentFixture<EditorDeFalas> {
  TestBed.configureTestingModule({ imports: [EditorDeFalas] });
  const f = TestBed.createComponent(EditorDeFalas);
  f.componentRef.setInput('falas', falas);
  f.componentRef.setInput('elenco', ELENCO);
  f.detectChanges();
  return f;
}

describe('EditorDeFalas', () => {
  beforeEach(() => TestBed.resetTestingModule());

  /** O caminho principal: colar a conversa inteira em vez de escolher linha a linha. */
  it('a conversa colada vira falas, com o nome do elenco reconhecido', () => {
    const f = criar([novaFala()]);
    const recebidas: FalaDoForm[][] = [];
    f.componentInstance.mudou.subscribe((l) => recebidas.push(l));

    const c = f.componentInstance as unknown as {
      conversa: { set(v: string): void };
      separar(): void;
    };
    c.conversa.set('mulher de branco: Você já esteve aqui.\nVOZ NO RÁDIO: Treze.');
    c.separar();

    const [falas] = recebidas;
    expect(falas).toHaveLength(2);
    expect(falas[0]).toEqual(expect.objectContaining({ characterId: 1, speaker: '' }));
    expect(falas[1]).toEqual(
      expect.objectContaining({ characterId: null, speaker: 'VOZ NO RÁDIO', text: 'Treze.' }),
    );
  });

  it('rótulo que não está no elenco oferece cadastrar', () => {
    const f = criar([novaFala({ speaker: 'James', text: 'Nunca estive aqui.' })]);
    const pedidos: string[] = [];
    f.componentInstance.cadastrarRotulo.subscribe((n) => pedidos.push(n));

    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.soltos__nome')!.click();
    expect(pedidos).toEqual(['James']);
  });

  it('mover troca a ordem das falas', () => {
    const a = novaFala({ text: 'primeira' });
    const b = novaFala({ text: 'segunda' });
    const f = criar([a, b]);
    const recebidas: FalaDoForm[][] = [];
    f.componentInstance.mudou.subscribe((l) => recebidas.push(l));

    (f.componentInstance as unknown as { mover(i: number, d: 1 | -1): void }).mover(0, 1);
    expect(recebidas[0].map((x) => x.text)).toEqual(['segunda', 'primeira']);
  });
});
