import { Injectable } from '@angular/core';
import { ConfirmOptions, ConfirmService } from '@xcorpiiion/ui';
import { Observable } from 'rxjs';

/**
 * O `ConfirmService` da lib, com o botão de cancelar em português.
 *
 * <p>A lib não tem domínio nem idioma, e o padrão dela é `'Cancel'`. Nenhuma chamada do
 * site passava o rótulo, então toda confirmação saía com um botão em inglês ao lado de um
 * "excluir" em português.
 *
 * <p>Entra no lugar do original em `app.config.ts`, e não como serviço à parte: quem injeta
 * `ConfirmService` continua injetando, e os testes que o substituem por um dublê continuam
 * valendo. Rótulo passado na chamada ainda vence.
 */
@Injectable()
export class ConfirmacaoService extends ConfirmService {
  override ask(options: ConfirmOptions): Observable<boolean> {
    return super.ask({ cancelLabel: 'cancelar', ...options });
  }
}
