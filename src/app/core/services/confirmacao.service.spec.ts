import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { of } from 'rxjs';
import { ConfirmService } from '@xcorpiiion/ui';
import { ConfirmacaoService } from './confirmacao.service';

describe('ConfirmacaoService', () => {
  afterEach(() => vi.restoreAllMocks());

  function montar() {
    const original = vi.spyOn(ConfirmService.prototype, 'ask').mockReturnValue(of(true));
    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmService, useClass: ConfirmacaoService }],
    });
    return { servico: TestBed.inject(ConfirmService), original };
  }

  it('o cancelar sai em português quando a chamada não diz nada', () => {
    const { servico, original } = montar();

    servico.ask({ title: 'Excluir item' });

    expect(original).toHaveBeenCalledWith({ title: 'Excluir item', cancelLabel: 'cancelar' });
  });

  it('rótulo passado na chamada vence o padrão', () => {
    const { servico, original } = montar();

    servico.ask({ title: 'Sair', cancelLabel: 'continuar editando' });

    expect(original).toHaveBeenCalledWith({ title: 'Sair', cancelLabel: 'continuar editando' });
  });
});
