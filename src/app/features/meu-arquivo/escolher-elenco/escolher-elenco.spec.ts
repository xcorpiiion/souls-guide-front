import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import type { StoryCharacterDTO } from '@xcorpiiion/canonico';
import { EscolherElenco, NovoNoElenco } from './escolher-elenco';

const ELENCO: StoryCharacterDTO[] = [
  {
    id: 1,
    gameId: 7,
    kind: 'CHARACTER',
    name: 'Mulher de branco',
    description: null,
    bossId: null,
  },
  { id: 2, gameId: 7, kind: 'CREATURE', name: 'Manequim', description: null, bossId: null },
];

function criar(escolhidos: number[] = [], varios = true): ComponentFixture<EscolherElenco> {
  TestBed.configureTestingModule({ imports: [EscolherElenco] });
  const f = TestBed.createComponent(EscolherElenco);
  f.componentRef.setInput('elenco', ELENCO);
  f.componentRef.setInput('escolhidos', escolhidos);
  f.componentRef.setInput('varios', varios);
  f.componentRef.setInput('rotulo', 'quem aparece');
  f.componentRef.setInput('campoId', 'teste');
  f.detectChanges();
  return f;
}

function digitar(f: ComponentFixture<EscolherElenco>, texto: string): void {
  const campo = (f.nativeElement as HTMLElement).querySelector('input')!;
  campo.value = texto;
  campo.dispatchEvent(new Event('input'));
  f.detectChanges();
}

describe('EscolherElenco', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('busca sem acento e sem maiúscula, e escolher avisa com a lista nova', () => {
    const f = criar([2]);
    const mudancas: number[][] = [];
    f.componentInstance.mudou.subscribe((ids) => mudancas.push(ids));

    digitar(f, 'MULHER');
    const opcao = (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.opcao')!;
    expect(opcao.textContent).toContain('Mulher de branco');
    opcao.dispatchEvent(new Event('mousedown'));

    expect(mudancas).toEqual([[2, 1]]);
  });

  /** Mandar para outra tela no meio de um registro é o jeito de a pessoa desistir do elenco. */
  it('nome que não está no elenco oferece cadastrar ali mesmo', () => {
    const f = criar();
    const pedidos: NovoNoElenco[] = [];
    f.componentInstance.cadastrar.subscribe((n) => pedidos.push(n));

    digitar(f, 'James');
    (f.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.opcao--nova')!
      .dispatchEvent(new Event('mousedown'));

    expect(pedidos).toEqual([{ nome: 'James', tipo: 'CHARACTER' }]);
  });

  it('nome que já existe, com outra maiúscula, não oferece cadastrar de novo', () => {
    const f = criar();
    digitar(f, 'manequim');
    expect((f.nativeElement as HTMLElement).querySelector('.opcao--nova')).toBeNull();
  });

  it('de um só: com alguém escolhido, o campo some até tirar', () => {
    const f = criar([1], false);
    expect((f.nativeElement as HTMLElement).querySelector('input')).toBeNull();
    expect((f.nativeElement as HTMLElement).textContent).toContain('Mulher de branco');
  });
});
