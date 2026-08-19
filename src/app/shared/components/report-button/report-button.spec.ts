import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import { ToastService } from '@xcorpiiion/ui';
import { ReportButton } from './report-button';
import { ModeracaoService } from '../../../core/services/moderacao.service';

const TOAST = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), show: vi.fn() };

function montar(logado: boolean, resposta: unknown = of({})) {
  const denunciar = vi.fn(() => resposta);

  TestBed.configureTestingModule({
    imports: [ReportButton],
    providers: [
      { provide: AuthService, useValue: { isLoggedIn: () => logado } },
      { provide: ModeracaoService, useValue: { denunciar } },
      { provide: ToastService, useValue: TOAST },
    ],
  });

  const fixture = TestBed.createComponent(ReportButton);
  fixture.componentRef.setInput('contentKind', 'QUEST');
  fixture.componentRef.setInput('contentId', '10');
  fixture.detectChanges();

  return { fixture, denunciar };
}

const html = (f: ComponentFixture<ReportButton>) => f.nativeElement as HTMLElement;

describe('ReportButton', () => {
  /** Denúncia anônima é denúncia que não se pode responsabilizar. */
  it('não aparece para quem não está logado', () => {
    const { fixture } = montar(false);

    expect(html(fixture).querySelector('.report__botao')).toBeNull();
  });

  it('aparece para quem está logado', () => {
    const { fixture } = montar(true);

    expect(html(fixture).querySelector('.report__botao')).not.toBeNull();
  });

  it('abre o formulário com os motivos', () => {
    const { fixture } = montar(true);

    html(fixture).querySelector<HTMLButtonElement>('.report__botao')!.click();
    fixture.detectChanges();

    expect(html(fixture).textContent).toContain('spoiler sem aviso');
    expect(html(fixture).textContent).toContain('nada é removido automaticamente');
  });

  it('envia a denúncia com o tipo e o id do conteúdo', () => {
    const { fixture, denunciar } = montar(true);

    html(fixture).querySelector<HTMLButtonElement>('.report__botao')!.click();
    fixture.detectChanges();
    html(fixture).querySelector<HTMLButtonElement>('.report__enviar')!.click();

    expect(denunciar).toHaveBeenCalledWith(
      expect.objectContaining({ contentKind: 'QUEST', contentId: 10, reason: 'SPOILER_SEM_AVISO' }),
    );
  });

  /**
   * 409 é a denúncia repetida, e não um erro: a pessoa já avisou, e repetir não acelera
   * nada. Dizer isso é melhor que "algo deu errado".
   */
  it('trata denúncia repetida como recado, não como falha', () => {
    const { fixture } = montar(
      true,
      throwError(() => ({ status: 409 })),
    );

    html(fixture).querySelector<HTMLButtonElement>('.report__botao')!.click();
    fixture.detectChanges();
    html(fixture).querySelector<HTMLButtonElement>('.report__enviar')!.click();

    expect(TOAST.info).toHaveBeenCalled();
    expect(TOAST.error).not.toHaveBeenCalled();
  });
});
