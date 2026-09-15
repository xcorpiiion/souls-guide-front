import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { EscolherJogo } from './escolher-jogo';
import { GameService } from '../../../core/services/game.service';
import { GameSummary } from '../../models/game.model';

const jogo = (id: string, name: string) =>
  ({ id, ref: id, name, shortName: name.slice(0, 2) }) as GameSummary;

let games: { list: ReturnType<typeof vi.fn>; search: ReturnType<typeof vi.fn> };

function criar(): ComponentFixture<EscolherJogo> {
  TestBed.configureTestingModule({
    imports: [EscolherJogo],
    providers: [{ provide: GameService, useValue: games }],
  });
  const f = TestBed.createComponent(EscolherJogo);
  f.detectChanges();
  return f;
}

function nomes(f: ComponentFixture<EscolherJogo>): string[] {
  return Array.from((f.nativeElement as HTMLElement).querySelectorAll('.jogo__nome')).map(
    (e) => e.textContent?.trim() ?? '',
  );
}

describe('EscolherJogo', () => {
  beforeEach(() => {
    games = {
      list: vi.fn(() => of({ content: [jogo('1', 'Elden Ring'), jogo('53', 'Silent Hill f')] })),
      search: vi.fn(() => of([jogo('53', 'Silent Hill f')])),
    };
  });

  afterEach(() => vi.useRealTimers());

  it('abre com jogos para tocar, e não com um campo vazio', () => {
    expect(nomes(criar())).toEqual(['Elden Ring', 'Silent Hill f']);
  });

  it('digitando, troca as sugestões pelo resultado da busca', () => {
    vi.useFakeTimers();
    const f = criar();
    const campo = (f.nativeElement as HTMLElement).querySelector('input')!;
    campo.value = 'silent';
    campo.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    f.detectChanges();

    expect(games.search).toHaveBeenCalledWith('silent');
    expect(nomes(f)).toEqual(['Silent Hill f']);
  });

  it('tocar num jogo avisa quem usa', () => {
    const f = criar();
    const escolhidos: GameSummary[] = [];
    f.componentInstance.escolhido.subscribe((g) => escolhidos.push(g));

    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.jogo')!.click();
    expect(escolhidos.map((g) => g.name)).toEqual(['Elden Ring']);
  });
});
