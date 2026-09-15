import { Component, input, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import type { GameDTO } from '@xcorpiiion/canonico';
import { LoreMesa } from './lore-mesa';
import { GameService } from '../../core/services/game.service';
import { GameSummary } from '../../shared/models/game.model';
import { EscolherJogo } from '../../shared/components/escolher-jogo/escolher-jogo';
import { MeuArquivo } from '../meu-arquivo/meu-arquivo';
import { Lore } from '../lore/lore';

// Os três filhos têm teste próprio; aqui só importa qual deles a mesa desenha, e com o quê.
@Component({ selector: 'app-meu-arquivo', template: 'ARQUIVO {{ gameName() }}' })
class ArquivoFalso {
  readonly gameId = input.required<string>();
  readonly gameName = input('');
}

@Component({ selector: 'app-lore', template: 'PUBLICADAS' })
class LoreFalsa {
  readonly embutida = input(false);
}

@Component({ selector: 'app-escolher-jogo', template: 'ESCOLHER' })
class EscolherFalso {
  readonly escolhido = output<GameSummary>();
}

const SILENT = {
  id: 53,
  slug: 'silent-hill-f',
  name: 'Silent Hill f',
  shortName: 'SH',
  dentroDoEscopo: true,
} as unknown as GameDTO;

let query: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
let logado: ReturnType<typeof signal<boolean>>;
let games: { get: ReturnType<typeof vi.fn> };

function criar(params: Record<string, string> = {}): ComponentFixture<LoreMesa> {
  query = new BehaviorSubject(convertToParamMap(params));
  TestBed.configureTestingModule({
    imports: [LoreMesa],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { queryParamMap: query } },
      { provide: GameService, useValue: games },
      { provide: AuthService, useValue: { isLoggedIn: logado } },
    ],
  });
  TestBed.overrideComponent(LoreMesa, {
    remove: { imports: [MeuArquivo, Lore, EscolherJogo] },
    add: { imports: [ArquivoFalso, LoreFalsa, EscolherFalso] },
  });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const f = TestBed.createComponent(LoreMesa);
  f.detectChanges();
  return f;
}

function texto(f: ComponentFixture<LoreMesa>): string {
  return (f.nativeElement as HTMLElement).textContent ?? '';
}

describe('LoreMesa', () => {
  beforeEach(() => {
    logado = signal(true);
    games = { get: vi.fn(() => of(SILENT)) };
  });

  it('logado, /lore abre no arquivo e pergunta o jogo', () => {
    const f = criar();
    expect(texto(f)).toContain('ESCOLHER');
    expect(texto(f)).not.toContain('PUBLICADAS');
  });

  /** O arquivo é privado; o visitante e o crawler vêm pela lista, que o SSR entrega. */
  it('deslogado, /lore abre nas publicadas', () => {
    logado.set(false);
    const f = criar();
    expect(texto(f)).toContain('PUBLICADAS');
  });

  it('com o jogo na URL, abre o arquivo dele', () => {
    const f = criar({ jogo: 'silent-hill-f' });
    expect(games.get).toHaveBeenCalledWith('silent-hill-f');
    expect(texto(f)).toContain('ARQUIVO Silent Hill f');
  });

  it('a aba pedida na URL vale mais que o padrão', () => {
    const f = criar({ jogo: 'silent-hill-f', aba: 'publicadas' });
    expect(texto(f)).toContain('PUBLICADAS');
    expect(texto(f)).not.toContain('ARQUIVO');
  });

  it('jogo fora do escopo não tem arquivo', () => {
    games.get.mockReturnValue(of({ ...SILENT, dentroDoEscopo: false }));
    const f = criar({ jogo: 'silent-hill-f' });
    expect(texto(f)).toContain('não tem guias aqui');
    expect(texto(f)).not.toContain('ARQUIVO');
  });

  it('trocar de aba guarda a escolha na URL, sem perder o jogo', () => {
    const f = criar({ jogo: 'silent-hill-f' });
    const abas = (f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('[role=tab]');
    abas[1].click();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([], {
      queryParams: { aba: 'publicadas' },
      queryParamsHandling: 'merge',
    });
  });
});
