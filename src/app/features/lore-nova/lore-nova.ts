import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { StoryCharacterDTO, StoryFindingDTO, StoryLinkDTO } from '@xcorpiiion/canonico';
import { GameService } from '../../core/services/game.service';
import { StoryArchiveService } from '../../core/services/story-archive.service';
import { GameSummary, gameToSummary } from '../../shared/models/game.model';
import { naoEncontrado, statusHttp } from '../../shared/utils/http-error';
import { EscolherJogo } from '../../shared/components/escolher-jogo/escolher-jogo';
import { decorar } from '../meu-arquivo/arquivo.model';
import { MontarLore } from '../meu-arquivo/montar-lore/montar-lore';

type Estado = 'escolher' | 'carregando' | 'pronto' | 'fora-do-escopo' | 'falhou';

/**
 * `/lore/new`: a lore nasce do arquivo de achados. Ver ADR 0008 e 0010.
 *
 * <p>O jogo vem em `?jogo=` quando a pessoa chega pela mesa ou pela página dele. Sem ele, a
 * tela pergunta primeiro, e grava a escolha na URL: recarregar não pode devolver à busca.
 */
@Component({
  selector: 'app-lore-nova',
  imports: [RouterLink, MontarLore, EscolherJogo],
  templateUrl: './lore-nova.html',
  styleUrl: './lore-nova.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreNova {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly games = inject(GameService);
  private readonly arquivo = inject(StoryArchiveService);

  protected readonly estado = signal<Estado>('escolher');
  protected readonly jogo = signal<GameSummary | null>(null);
  protected readonly achados = signal<StoryFindingDTO[]>([]);
  protected readonly ligacoes = signal<StoryLinkDTO[]>([]);
  private readonly elenco = signal<StoryCharacterDTO[]>([]);

  protected readonly itens = computed(() =>
    decorar(this.achados(), this.ligacoes(), this.elenco()),
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const ref = q.get('jogo');
      if (ref) this.abrir(ref);
      else this.limpar();
    });
  }

  protected escolher(jogo: GameSummary): void {
    void this.router.navigate([], { queryParams: { jogo: jogo.id } });
  }

  /** Voltar do montar lore leva à mesa do jogo, que é de onde os achados vêm. */
  protected voltarParaAMesa(): void {
    const g = this.jogo();
    void this.router.navigate(['/lore'], g ? { queryParams: { jogo: g.ref } } : {});
  }

  protected trocarDeJogo(): void {
    void this.router.navigate([], { queryParams: {} });
  }

  protected tentarDeNovo(): void {
    const ref = this.route.snapshot.queryParamMap.get('jogo');
    if (ref) this.abrir(ref);
  }

  private limpar(): void {
    this.jogo.set(null);
    this.achados.set([]);
    this.ligacoes.set([]);
    this.estado.set('escolher');
  }

  private abrir(ref: string): void {
    this.estado.set('carregando');
    this.games
      .get(ref)
      .pipe(
        switchMap((g) => {
          const jogo = gameToSummary(g);
          this.jogo.set(jogo);
          // Fora do escopo o jogo é ficha mínima e não tem arquivo (ADR 0027 e 0032 do
          // souls-guide-api). Perguntar ao servidor só para ouvir 409 seria uma volta à toa.
          if (jogo.dentroDoEscopo === false) return of(null);
          return this.arquivo.archive(jogo.id);
        }),
      )
      .subscribe({
        next: (arquivo) => {
          if (!arquivo) {
            this.estado.set('fora-do-escopo');
            return;
          }
          this.achados.set(arquivo.findings);
          this.ligacoes.set(arquivo.links);
          this.elenco.set(arquivo.characters ?? []);
          this.estado.set('pronto');
        },
        error: (e: unknown) => {
          // Jogo que não existe na query: a tela abre como se ela não viesse.
          if (naoEncontrado(e)) this.limpar();
          else this.estado.set(statusHttp(e) === 409 ? 'fora-do-escopo' : 'falhou');
        },
      });
  }
}
