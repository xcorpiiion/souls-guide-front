import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PfPageLoader, ToastService } from '@xcorpiiion/ui';
import type { ContentReportDTO, ReportStatus } from '@xcorpiiion/canonico';
import { ModeracaoService } from '../../core/services/moderacao.service';
import { SeoService } from '../../core/services/seo.service';
import { CONTENT_KIND_LABEL, REPORT_REASON_LABEL } from '../../shared/models/moderacao.model';

/** As abas da fila. `OPEN` primeiro porque é onde há trabalho a fazer. */
const ABAS: { status: ReportStatus; label: string }[] = [
  { status: 'OPEN', label: 'abertas' },
  { status: 'RESOLVED', label: 'resolvidas' },
  { status: 'DISMISSED', label: 'arquivadas' },
];

@Component({
  selector: 'app-moderacao',
  imports: [RouterLink, FormsModule, PfPageLoader],
  templateUrl: './moderacao.html',
  styleUrl: './moderacao.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Moderacao implements OnInit {
  private readonly moderacao = inject(ModeracaoService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);

  protected readonly abas = ABAS;
  protected readonly kindLabel = CONTENT_KIND_LABEL;
  protected readonly reasonLabel = REPORT_REASON_LABEL;

  protected readonly aba = signal<ReportStatus>('OPEN');
  protected readonly denuncias = signal<ContentReportDTO[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);

  /** Qual denúncia está com o painel de decisão aberto. */
  protected readonly decidindo = signal<number | null>(null);
  protected readonly nota = signal('');
  protected readonly comStrike = signal(false);
  protected readonly salvando = signal(false);

  protected readonly vazio = computed(() => !this.loading() && this.denuncias().length === 0);

  ngOnInit(): void {
    this.seo.aplicar({
      titulo: 'Moderação',
      descricao: 'Fila de denúncias do SoulGuide.',
      indexavel: false,
    });
    this.carregar();
  }

  protected trocarAba(status: ReportStatus): void {
    this.aba.set(status);
    this.decidindo.set(null);
    this.carregar();
  }

  protected abrirDecisao(id: number): void {
    this.decidindo.set(id);
    this.nota.set('');
    this.comStrike.set(false);
  }

  protected decidir(id: number, status: ReportStatus): void {
    this.salvando.set(true);

    this.moderacao
      .resolver(id, { status, note: this.nota().trim() || null, applyStrike: this.comStrike() })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.decidindo.set(null);
          this.toast.success(
            status === 'RESOLVED' ? 'Denúncia resolvida' : 'Denúncia arquivada',
            this.comStrike() ? 'Strike aplicado ao autor.' : 'Sem strike.',
          );
          this.carregar();
        },
        error: () => {
          this.salvando.set(false);
          this.toast.error('Não foi possível decidir', 'Tente de novo em instantes.');
        },
      });
  }

  /** O caminho de volta para o conteúdo denunciado, quando ele ainda existe. */
  protected linkDo(denuncia: ContentReportDTO): unknown[] | null {
    if (denuncia.contentGone) return null;

    switch (denuncia.contentKind) {
      case 'LORE':
        return ['/lore', denuncia.contentId];
      case 'QUEST':
        return ['/quests'];
      default:
        return null;
    }
  }

  private carregar(): void {
    this.loading.set(true);

    this.moderacao.fila(this.aba()).subscribe({
      next: (page) => {
        this.denuncias.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
