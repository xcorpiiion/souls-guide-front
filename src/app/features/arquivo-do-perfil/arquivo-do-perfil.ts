import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GameService } from '../../core/services/game.service';
import { GameSummary, gameToSummary } from '../../shared/models/game.model';
import { EscolherJogo } from '../../shared/components/escolher-jogo/escolher-jogo';
import { MeuArquivo } from '../meu-arquivo/meu-arquivo';
import { LorePublicadas } from '../lore-mesa/lore-publicadas/lore-publicadas';

type Aba = 'arquivo' | 'lores';

/**
 * `/profile/lore/arquivo` — a mesa do perfil. Ver ADR 0012 do front e 0035 do souls-guide-api.
 *
 * <p>É a mesma mesa de `/lore` — registrar achado, elenco, ligações, montar lore —, sobre o
 * <b>outro</b> arquivo da pessoa. O que se registra aqui não aparece na mesa da lore, e a lore
 * montada aqui fica no perfil.
 *
 * <p>As mesmas duas abas da mesa de `/lore`: <b>meu arquivo</b> e, no lugar de "publicadas",
 * <b>minhas lores</b> — a leitura das lores do perfil daquele jogo, com o desenho da lista das
 * publicadas.
 */
@Component({
  selector: 'app-arquivo-do-perfil',
  imports: [RouterLink, EscolherJogo, MeuArquivo, LorePublicadas],
  templateUrl: './arquivo-do-perfil.html',
  styleUrl: './arquivo-do-perfil.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArquivoDoPerfil {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly games = inject(GameService);

  protected readonly jogoRef = signal<string | null>(null);
  protected readonly jogo = signal<GameSummary | null>(null);
  protected readonly jogoNaoAbriu = signal(false);
  protected readonly aba = signal<Aba>('arquivo');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      this.aba.set(q.get('aba') === 'lores' ? 'lores' : 'arquivo');
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
    void this.router.navigate([], { queryParams: { jogo: null }, queryParamsHandling: 'merge' });
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
