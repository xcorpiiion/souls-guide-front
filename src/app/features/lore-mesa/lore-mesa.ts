import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@xcorpiiion/ng-core';
import { GameService } from '../../core/services/game.service';
import { GameSummary, gameToSummary } from '../../shared/models/game.model';
import { EscolherJogo } from '../../shared/components/escolher-jogo/escolher-jogo';
import { MeuArquivo } from '../meu-arquivo/meu-arquivo';
import { Lore } from '../lore/lore';

type Aba = 'arquivo' | 'publicadas';

/**
 * `/lore` — a mesa. Ver ADR 0010.
 *
 * <p>O arquivo de achados morava numa aba da página do jogo, e quem ia escrever lore ia
 * para "Lore" no menu e encontrava a lista antiga de artigos. Agora a lore é o lugar das duas
 * coisas: <b>meu arquivo</b> (a mesa do design) e <b>publicadas</b> (a lista de artigos).
 *
 * <p>O jogo vai em `?jogo=`, e não no caminho: `/lore/:id` já é o endereço do artigo, e
 * `/lore/silent-hill-f` seria ambíguo com o slug de uma lore.
 *
 * <p><b>Quem não está logado abre em "publicadas".</b> O arquivo é privado e pede login; o
 * crawler e o visitante vêm pela lista, e é ela que o SSR precisa entregar.
 */
@Component({
  selector: 'app-lore-mesa',
  imports: [EscolherJogo, MeuArquivo, Lore],
  templateUrl: './lore-mesa.html',
  styleUrl: './lore-mesa.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreMesa {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly games = inject(GameService);
  protected readonly auth = inject(AuthService);

  /** O jogo como está na URL: id ou slug. */
  protected readonly jogoRef = signal<string | null>(null);
  protected readonly jogo = signal<GameSummary | null>(null);
  protected readonly jogoNaoAbriu = signal(false);
  private readonly abaPedida = signal<Aba | null>(null);

  protected readonly aba = computed<Aba>(
    () => this.abaPedida() ?? (this.auth.isLoggedIn() ? 'arquivo' : 'publicadas'),
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const aba = q.get('aba');
      this.abaPedida.set(aba === 'arquivo' || aba === 'publicadas' ? aba : null);

      const ref = q.get('jogo');
      if (ref === this.jogoRef()) return;
      this.jogoRef.set(ref);
      this.jogo.set(null);
      this.jogoNaoAbriu.set(false);
      if (ref) this.carregarJogo(ref);
    });
  }

  protected irPara(aba: Aba): void {
    void this.router.navigate([], { queryParams: { aba }, queryParamsHandling: 'merge' });
  }

  protected escolher(jogo: GameSummary): void {
    void this.router.navigate([], {
      queryParams: { jogo: jogo.ref },
      queryParamsHandling: 'merge',
    });
  }

  protected trocarDeJogo(): void {
    void this.router.navigate([], {
      queryParams: { jogo: null },
      queryParamsHandling: 'merge',
    });
  }

  private carregarJogo(ref: string): void {
    this.games.get(ref).subscribe({
      next: (g) => {
        if (this.jogoRef() === ref) this.jogo.set(gameToSummary(g));
      },
      error: () => {
        if (this.jogoRef() === ref) this.jogoNaoAbriu.set(true);
      },
    });
  }
}
