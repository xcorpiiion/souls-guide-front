import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import type {
  StoryCharacterDTO,
  StoryCharacterRequest,
  StoryFindingDTO,
} from '@xcorpiiion/canonico';
import { FichaDoPersonagem } from './ficha-do-personagem';
import { BossService } from '../../../core/services/boss.service';
import { decorar } from '../arquivo.model';

const MULHER: StoryCharacterDTO = {
  id: 9,
  gameId: 7,
  kind: 'CHARACTER',
  name: 'Mulher de branco',
  description: 'aparece no hospital',
  bossId: null,
};

function achado(id: number, extra: Partial<StoryFindingDTO>): StoryFindingDTO {
  return {
    id,
    gameId: 7,
    kind: 'NOTE',
    title: `Achado ${id}`,
    body: 'texto',
    chapter: 'Cap. 2',
    speaker: null,
    note: null,
    createdAt: '2026-09-13T20:00:00Z',
    authorId: null,
    inGameDate: null,
    characterIds: [],
    lines: [],
    ...extra,
  };
}

function criar(personagem: StoryCharacterDTO | null): ComponentFixture<FichaDoPersonagem> {
  TestBed.configureTestingModule({
    imports: [FichaDoPersonagem],
    providers: [
      provideRouter([]),
      { provide: BossService, useValue: { list: vi.fn(() => of([])) } },
    ],
  });
  const f = TestBed.createComponent(FichaDoPersonagem);
  const achados = [
    achado(1, {
      kind: 'DIALOGUE',
      title: 'Conversa na ponte',
      characterIds: [9],
      lines: [{ characterId: 9, speaker: null, text: 'Você já esteve aqui.' }],
    }),
    achado(2, { title: 'Bilhete', authorId: 9 }),
    achado(3, { title: 'Não tem nada com ela' }),
  ];
  f.componentRef.setInput('personagem', personagem);
  f.componentRef.setInput('itens', decorar(achados, [], personagem ? [personagem] : []));
  f.componentRef.setInput('gameId', '7');
  f.detectChanges();
  return f;
}

describe('FichaDoPersonagem', () => {
  beforeEach(() => TestBed.resetTestingModule());

  /** A história não é um campo: são os achados em que ela aparece, e as falas dela. */
  it('junta os achados em que aparece, com o papel e as falas dela', () => {
    const texto = (criar(MULHER).nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('aparece em 2 achados');
    expect(texto).toContain('Conversa na ponte');
    expect(texto).toContain('“Você já esteve aqui.”');
    expect(texto).toContain('escreveu');
    expect(texto).not.toContain('Não tem nada com ela');
  });

  it('sem personagem, abre no cadastro e manda o pedido', () => {
    const f = criar(null);
    const pedidos: StoryCharacterRequest[] = [];
    f.componentInstance.salvar.subscribe((r) => pedidos.push(r));

    const campo = (f.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#elenco-nome')!;
    campo.value = 'Manequim';
    campo.dispatchEvent(new Event('input'));
    f.detectChanges();
    (f.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type=submit]')!
      .click();

    expect(pedidos).toEqual([
      { kind: 'CHARACTER', name: 'Manequim', description: null, bossId: null },
    ]);
  });
});
