import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TPipe } from '../../../core/i18n/t.pipe';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@xcorpiiion/ng-core';
import { ToastService } from '@xcorpiiion/ui';
import type { ContentKind, ReportReason } from '@xcorpiiion/canonico';
import { ModeracaoService } from '../../../core/services/moderacao.service';
import { REPORT_REASON_LABEL, REPORT_REASON_ORDER } from '../../models/moderacao.model';

/**
 * O botão de denunciar, e o formulário curto que ele abre.
 *
 * Só aparece para quem está logado: denúncia anônima é denúncia que não se pode
 * responsabilizar, e o servidor recusaria de qualquer forma.
 */
@Component({
  selector: 'app-report-button',
  imports: [FormsModule, TPipe],
  templateUrl: './report-button.html',
  styleUrl: './report-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportButton {
  private readonly moderacao = inject(ModeracaoService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  readonly contentKind = input.required<ContentKind>();
  readonly contentId = input.required<string | number>();

  protected readonly reasonLabel = REPORT_REASON_LABEL;
  protected readonly reasons = REPORT_REASON_ORDER;

  protected readonly aberto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly motivo = signal<ReportReason>('SPOILER_SEM_AVISO');
  protected readonly detalhes = signal('');

  protected abrir(): void {
    this.aberto.set(true);
  }

  protected fechar(): void {
    this.aberto.set(false);
    this.detalhes.set('');
  }

  protected enviar(): void {
    this.enviando.set(true);

    this.moderacao
      .denunciar({
        contentKind: this.contentKind(),
        contentId: Number(this.contentId()),
        reason: this.motivo(),
        details: this.detalhes().trim() || null,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.fechar();
          this.toast.success(
            'Denúncia enviada',
            'Alguém da moderação vai olhar. Obrigado por avisar.',
          );
        },
        error: (err: HttpErrorResponse) => {
          this.enviando.set(false);

          // 409 é a denúncia repetida, e não um erro: a pessoa já avisou, e repetir não
          // acelera nada. Dizer isso é melhor que "algo deu errado".
          if (err.status === 409) {
            this.fechar();
            this.toast.info('Você já denunciou', 'Esta denúncia ainda está em análise.');
            return;
          }

          this.toast.error('Não foi possível denunciar', 'Tente de novo em instantes.');
        },
      });
  }
}
