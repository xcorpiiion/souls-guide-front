import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { GameService } from '../../../core/services/game.service';
import { GameSummary } from '../../models/game.model';

/** Quantos jogos aparecem antes de a pessoa digitar qualquer coisa. */
const SUGESTOES = 8;

/**
 * "De qual jogo?" — a busca de jogo da lore: a mesa em `/lore` e a nova lore em `/lore/new`.
 *
 * <p>Abre já com alguns jogos do catálogo, e não com um campo vazio. Quem chega aqui pela
 * primeira vez não sabe que precisa digitar, e uma lista para tocar é o caminho mais curto no
 * celular.
 */
@Component({
  selector: 'app-escolher-jogo',
  templateUrl: './escolher-jogo.html',
  styleUrl: './escolher-jogo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscolherJogo {
  private readonly games = inject(GameService);
  private readonly busca$ = new Subject<string>();

  readonly escolhido = output<GameSummary>();

  protected readonly consulta = signal('');
  protected readonly buscando = signal(false);
  protected readonly sugestoes = signal<GameSummary[]>([]);
  protected readonly resultados = signal<GameSummary[]>([]);

  constructor() {
    this.games
      .list({ size: SUGESTOES })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (pagina) => this.sugestoes.set(pagina.content),
        error: () => {
          // Sem sugestões a busca continua funcionando; não há o que avisar.
        },
      });

    this.busca$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) {
            this.buscando.set(false);
            return of<GameSummary[]>([]);
          }
          this.buscando.set(true);
          return this.games.search(q.trim());
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (lista) => {
          this.resultados.set(lista);
          this.buscando.set(false);
        },
        error: () => this.buscando.set(false),
      });
  }

  protected digitar(valor: string): void {
    this.consulta.set(valor);
    this.busca$.next(valor);
  }

  protected buscandoAlgo(): boolean {
    return this.consulta().trim().length >= 2;
  }
}
