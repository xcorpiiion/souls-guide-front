import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TPipe } from '../../core/i18n/t.pipe';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PfPageLoader } from '@xcorpiiion/ui';
import type { RunOverviewDTO, RunWarningDTO } from '@xcorpiiion/canonico';
import { RunService } from '../../core/services/run.service';
import { SeoService } from '../../core/services/seo.service';

/** Rótulo de cada tipo de final, igual ao da página de finais. */
const KIND_LABEL: Record<string, string> = {
  STANDARD: 'padrão',
  TRUE: 'verdadeiro',
  SECRET: 'secreto',
  JOKE: 'piada',
  BAD: 'ruim',
  DLC: 'dlc',
};

@Component({
  selector: 'app-run-panel',
  imports: [RouterLink, PfPageLoader, TPipe],
  templateUrl: './run-panel.html',
  styleUrl: './run-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunPanel implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly runService = inject(RunService);
  private readonly seo = inject(SeoService);

  protected readonly kindLabel = KIND_LABEL;
  protected readonly gameId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly run = signal<RunOverviewDTO | null>(null);

  /**
   * Quais avisos de spoiler já foram revelados, por índice.
   *
   * Saber que existe um ponto sem retorno não é spoiler; qual é, é — então o aviso aparece
   * na lista com o texto coberto, e quem quer ler pede.
   */
  private readonly revelados = signal<ReadonlySet<number>>(new Set());

  protected readonly percent = computed(() => {
    const r = this.run();
    if (!r || r.stepsTotal === 0) return 0;
    return Math.round((r.stepsDone / r.stepsTotal) * 100);
  });

  /** Comportamento a manter vem primeiro: ele vale agora, o resto é sobre o futuro. */
  protected readonly avisosAEvitar = computed(
    () => this.run()?.warnings.filter((a) => a.kind === 'AVOID') ?? [],
  );

  protected readonly pontosSemRetorno = computed(
    () => this.run()?.warnings.filter((a) => a.kind === 'POINT_OF_NO_RETURN') ?? [],
  );

  protected readonly finaisEmCurso = computed(
    () => this.run()?.endings.filter((f) => !f.achieved) ?? [],
  );

  protected readonly finaisAlcancados = computed(
    () => this.run()?.endings.filter((f) => f.achieved) ?? [],
  );

  protected readonly vazio = computed(() => {
    const r = this.run();
    return !!r && r.quests.length === 0 && r.endings.length === 0;
  });

  ngOnInit(): void {
    this.runService.overview(this.gameId).subscribe({
      next: (run) => {
        this.run.set(run);
        this.seo.aplicar({
          titulo: `Minha run · ${run.gameName}`,
          descricao: `Progresso, finais e avisos da sua run de ${run.gameName}.`,
          indexavel: false,
        });
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.status === 404 ? 'Jogo não encontrado.' : 'Não foi possível carregar sua run.',
        );
        this.loading.set(false);
      },
    });
  }

  protected percentOf(feitos: number, total: number): number {
    return total === 0 ? 0 : Math.round((feitos / total) * 100);
  }

  protected revelado(indice: number, aviso: RunWarningDTO): boolean {
    return !aviso.spoiler || this.revelados().has(indice);
  }

  protected revelar(indice: number): void {
    this.revelados.update((atual) => new Set(atual).add(indice));
  }
}
