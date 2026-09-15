import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { GuiaDoArquivo, PassoDoGuia } from './guia-do-arquivo';

function criar(achados: number, ligacoes: number): ComponentFixture<GuiaDoArquivo> {
  TestBed.configureTestingModule({ imports: [GuiaDoArquivo] });
  const f = TestBed.createComponent(GuiaDoArquivo);
  f.componentRef.setInput('achados', achados);
  f.componentRef.setInput('ligacoes', ligacoes);
  f.detectChanges();
  return f;
}

function passoAtual(f: ComponentFixture<GuiaDoArquivo>): string {
  return (
    (f.nativeElement as HTMLElement).querySelector('.passo--agora .passo__titulo')?.textContent ??
    ''
  ).trim();
}

describe('GuiaDoArquivo', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem('sg_guia_arquivo_fechado');
  });

  it('arquivo vazio: o passo é registrar', () => {
    expect(passoAtual(criar(0, 0))).toContain('registre o que achou');
  });

  it('com achados e nenhuma ligação: o passo é ligar', () => {
    expect(passoAtual(criar(3, 0))).toContain('ligue as peças');
  });

  it('com uma ligação: o passo é montar', () => {
    expect(passoAtual(criar(3, 1))).toContain('monte a lore');
  });

  /** Ligar pede dois achados; com um só o botão não teria o que fazer. */
  it('com um achado, ligar fica indisponível e diz por quê', () => {
    const f = criar(1, 0);
    const botoes = Array.from(
      (f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.passo__acao'),
    );
    expect(botoes[1].disabled).toBe(true);
    expect(botoes[1].textContent).toContain('precisa de 2 achados');
    expect(botoes[2].disabled).toBe(false);
  });

  it('o botão do passo avisa qual ação a mesa deve abrir', () => {
    const f = criar(3, 0);
    const pedidos: PassoDoGuia[] = [];
    f.componentInstance.agir.subscribe((p) => pedidos.push(p));
    (f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.passo__acao')[1].click();
    expect(pedidos).toEqual(['ligar']);
  });

  it('fechar esconde, é lembrado, e abrir traz de volta', () => {
    const f = criar(0, 0);
    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.guia__fechar')!.click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.guia')).toBeNull();

    TestBed.resetTestingModule();
    const denovo = criar(0, 0);
    expect(denovo.nativeElement.querySelector('.guia')).toBeNull();

    denovo.componentInstance.abrir();
    denovo.detectChanges();
    expect(denovo.nativeElement.querySelector('.guia')).not.toBeNull();
  });
});
