import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ENDING_KIND_LABEL,
  ENDING_STEP_KIND_LABEL,
  EndingChapter,
  EndingDetailApi,
  EndingStepApi,
  groupStepsByChapter,
} from '../../shared/models/ending.model';
import { EndingService } from '../../core/services/ending.service';
import { resumo, SeoService } from '../../core/services/seo.service';
import { AuthService } from '@xcorpiiion/ng-core';
import { ToastService } from '@xcorpiiion/ui';
import { PfPageLoader } from '@xcorpiiion/ui';

@Component({
  selector: 'app-ending-detail',
  imports: [RouterLink, PfPageLoader],
  templateUrl: './ending-detail.html',
  styleUrl: './ending-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndingDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly endingService = inject(EndingService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly kindLabel = ENDING_KIND_LABEL;
  protected readonly stepKindLabel = ENDING_STEP_KIND_LABEL;

  private readonly endingId = this.route.snapshot.paramMap.get('endingId') ?? '';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly detail = signal<EndingDetailApi | null>(null);

  /** Ids dos passos já marcados. Set para o template consultar sem varrer a lista. */
  protected readonly completedStepIds = signal<ReadonlySet<string>>(new Set());
  protected readonly achieved = signal(false);
  protected readonly savingStepId = signal<string | null>(null);

  protected readonly likeCount = signal(0);
  protected readonly userHasLiked = signal(false);
  protected readonly liking = signal(false);
  protected readonly userIsFollowing = signal(false);
  protected readonly following = signal(false);

  /** O resumo fica escondido quando é spoiler, até o leitor pedir. O título não. */
  protected readonly summaryRevealed = signal(false);

  protected readonly ending = computed(() => this.detail()?.ending ?? null);

  /**
   * O resumo de um final marcado como spoiler **não** vai para a descrição.
   *
   * A página esconde o resumo até o leitor pedir; repeti-lo na meta o entregaria no
   * resultado do Google e no preview do Discord, que é justamente onde ele aparece sem
   * ninguém ter pedido. A página fica indexável — o que não sai é o texto.
   */
  private aplicarSeo(): void {
    const e = this.ending();
    if (!e) return;

    const passos = this.totalSteps();

    this.seo.aplicar({
      titulo: `${e.title} · finais de ${e.gameName}`,
      descricao: e.isSpoiler
        ? `Guia do final ${this.kindLabel[e.kind]} “${e.title}” de ${e.gameName}` +
          (passos ? `, em ${passos} passos.` : '.') +
          ' Contém spoiler.'
        : resumo(e.summary) ||
          `Como alcançar o final ${this.kindLabel[e.kind]} de ${e.gameName}` +
            (passos ? `, em ${passos} passos.` : '.'),
      tipo: 'article',
    });
  }

  protected readonly chapters = computed<EndingChapter[]>(() =>
    groupStepsByChapter(this.detail()?.steps ?? []),
  );

  protected readonly totalSteps = computed(() => this.detail()?.steps.length ?? 0);

  protected readonly completedCount = computed(
    () => this.detail()?.steps.filter((s) => this.isDone(s)).length ?? 0,
  );

  protected readonly progressPercent = computed(() => {
    const total = this.totalSteps();
    return total === 0 ? 0 : Math.round((this.completedCount() / total) * 100);
  });

  ngOnInit(): void {
    this.endingService.get(this.endingId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.likeCount.set(detail.ending.likeCount);
        this.userHasLiked.set(detail.ending.userHasLiked);
        this.userIsFollowing.set(detail.ending.userIsFollowing);
        this.summaryRevealed.set(!detail.ending.isSpoiler);
        this.aplicarSeo();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Final não encontrado.');
        this.seo.aplicar({
          titulo: 'Final não encontrado',
          descricao: 'Este final não existe ou foi removido.',
          indexavel: false,
        });
        this.loading.set(false);
      },
    });

    if (this.auth.isLoggedIn()) {
      this.endingService.getProgress(this.endingId).subscribe({
        next: (p) => {
          this.completedStepIds.set(new Set(p.completedStepIds));
          this.achieved.set(p.achieved);
        },
      });
    }
  }

  protected isDone(step: EndingStepApi): boolean {
    return this.completedStepIds().has(String(step.id));
  }

  protected revealSummary(): void {
    this.summaryRevealed.set(true);
  }

  /**
   * Marca ou desmarca o passo. Vale para todo tipo, inclusive `AVOID`: marcar um
   * "não se cure com vida baixa" quer dizer "estou mantendo isso nesta run".
   */
  protected toggleStep(step: EndingStepApi): void {
    if (!this.auth.isLoggedIn() || this.savingStepId() !== null) return;

    const stepId = String(step.id);
    const done = this.isDone(step);
    this.savingStepId.set(stepId);

    const call = done
      ? this.endingService.unmarkStep(this.endingId, stepId)
      : this.endingService.markStep(this.endingId, stepId);

    call.subscribe({
      next: (p) => {
        this.completedStepIds.set(new Set(p.completedStepIds));
        this.achieved.set(p.achieved);
        this.savingStepId.set(null);
      },
      error: () => {
        this.savingStepId.set(null);
        this.toast.error('Erro', 'Não foi possível salvar o progresso.');
      },
    });
  }

  protected toggleAchieved(): void {
    if (!this.auth.isLoggedIn()) return;
    const value = !this.achieved();
    this.endingService.setAchieved(this.endingId, value).subscribe({
      next: (p) => {
        this.achieved.set(p.achieved);
        if (p.achieved) {
          this.toast.success('Final registrado', 'Marcado como conseguido no seu perfil.');
        }
      },
      error: () => this.toast.error('Erro', 'Não foi possível registrar o final.'),
    });
  }

  protected toggleLike(): void {
    if (!this.auth.isLoggedIn() || this.liking()) return;
    this.liking.set(true);

    const call = this.userHasLiked()
      ? this.endingService.unlike(this.endingId)
      : this.endingService.like(this.endingId);

    call.subscribe({
      next: (r) => {
        this.likeCount.set(r.likeCount);
        this.userHasLiked.set(r.userHasLiked);
        this.liking.set(false);
      },
      error: () => this.liking.set(false),
    });
  }

  protected toggleFollow(): void {
    if (!this.auth.isLoggedIn() || this.following()) return;
    this.following.set(true);

    const call = this.userIsFollowing()
      ? this.endingService.unfollow(this.endingId)
      : this.endingService.follow(this.endingId);

    call.subscribe({
      next: (r) => {
        this.userIsFollowing.set(r.userIsFollowing);
        this.following.set(false);
      },
      error: () => this.following.set(false),
    });
  }

  protected trackStep(_: number, step: EndingStepApi): number {
    return step.id;
  }
}
