import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * `{{ 'nav.jogos' | t }}` — o texto da chave no idioma da interface.
 *
 * **Impuro de propósito.** O pipe puro só recalcula quando o argumento muda, e a chave
 * nunca muda: trocar de idioma não redesenharia nada. O custo é uma consulta a um objeto
 * por ciclo de detecção, e o app é zoneless — os ciclos são os que alguma coisa provocou.
 */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(chave: string, params?: Record<string, string | number>): string {
    return this.i18n.t(chave, params);
  }
}
