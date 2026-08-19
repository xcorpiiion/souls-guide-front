import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { of, throwError } from 'rxjs';
import type { RunOverviewDTO } from '@xcorpiiion/canonico';
import { RunPanel } from './run-panel';
import { RunService } from '../../core/services/run.service';

const RUN: RunOverviewDTO = {
  gameId: 17,
  gameName: 'Lies of P',
  questsStarted: 2,
  questsFinished: 1,
  stepsDone: 7,
  stepsTotal: 10,
  quests: [
    { questId: 10, title: 'Belle', stepsDone: 5, stepsTotal: 5, finished: true },
    { questId: 11, title: 'Eugénie', stepsDone: 2, stepsTotal: 5, finished: false },
  ],
  endings: [
    {
      endingId: 20,
      title: 'Rise of P',
      kind: 'TRUE',
      stepsDone: 3,
      stepsTotal: 8,
      avoidSteps: 2,
      achieved: false,
      spoiler: true,
    },
    {
      endingId: 21,
      title: 'Real Boy',
      kind: 'STANDARD',
      stepsDone: 4,
      stepsTotal: 4,
      avoidSteps: 0,
      achieved: true,
      spoiler: false,
    },
  ],
  warnings: [
    {
      kind: 'AVOID',
      text: 'Não minta para o Geppetto',
      questId: null,
      questTitle: 'Rise of P',
      spoiler: true,
    },
    {
      kind: 'POINT_OF_NO_RETURN',
      text: 'Falar com Sophia fecha a rota da Eugénie',
      questId: 11,
      questTitle: 'Eugénie',
      spoiler: false,
    },
  ],
};

function montar(overview: unknown): ComponentFixture<RunPanel> {
  TestBed.configureTestingModule({
    imports: [RunPanel],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '17' }) } },
      },
      { provide: RunService, useValue: { overview: () => overview } },
    ],
  });

  const fixture = TestBed.createComponent(RunPanel);
  fixture.detectChanges();
  return fixture;
}

const texto = (fixture: ComponentFixture<RunPanel>) =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('RunPanel', () => {
  it('mostra o progresso somado do jogo', () => {
    const fixture = montar(of(RUN));

    expect(texto(fixture)).toContain('Lies of P');
    expect(texto(fixture)).toContain('70%');
    expect(texto(fixture)).toContain('Belle');
  });

  it('separa final em curso de final alcançado', () => {
    const fixture = montar(of(RUN));
    const painel = fixture.componentInstance as unknown as {
      finaisEmCurso: () => unknown[];
      finaisAlcancados: () => unknown[];
    };

    expect(painel.finaisEmCurso()).toHaveLength(1);
    expect(painel.finaisAlcancados()).toHaveLength(1);
  });

  it('separa o que manter do que ainda dá para não fechar', () => {
    const fixture = montar(of(RUN));
    const painel = fixture.componentInstance as unknown as {
      avisosAEvitar: () => unknown[];
      pontosSemRetorno: () => unknown[];
    };

    expect(painel.avisosAEvitar()).toHaveLength(1);
    expect(painel.pontosSemRetorno()).toHaveLength(1);
  });

  /**
   * Saber que existe um ponto sem retorno não é spoiler; qual é, é. O aviso aparece na
   * lista com o texto coberto — se ele saísse na tela direto, o painel entregaria o que a
   * página do final esconde.
   */
  it('cobre o texto do aviso marcado como spoiler até o leitor pedir', () => {
    const fixture = montar(of(RUN));

    expect(texto(fixture)).not.toContain('Não minta para o Geppetto');
    expect(texto(fixture)).toContain('contém spoiler');

    expect(texto(fixture)).toContain('Falar com Sophia fecha a rota da Eugénie');
  });

  it('revela o aviso quando o leitor pede', () => {
    const fixture = montar(of(RUN));
    const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.run__spoiler',
    );

    botao!.click();
    fixture.detectChanges();

    expect(texto(fixture)).toContain('Não minta para o Geppetto');
  });

  it('convida a começar quando não há run', () => {
    const fixture = montar(
      of({ ...RUN, quests: [], endings: [], warnings: [], questsStarted: 0, stepsTotal: 0 }),
    );

    expect(texto(fixture)).toContain('sua run ainda não começou');
  });

  it('mostra recado de erro quando a chamada falha', () => {
    const fixture = montar(throwError(() => ({ status: 500 })));

    expect(texto(fixture)).toContain('Não foi possível carregar sua run');
  });
});
