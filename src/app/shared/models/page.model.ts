/**
 * A envelopagem de página que o Spring Data devolve.
 *
 * Não é declarada aqui: vem de `@xcorpiiion/ng-core`, junto do `HttpService`.
 * Ela não é domínio — é a forma que o back emite para qualquer listagem de
 * qualquer projeto —, então não nasce no `canonico` nem se repete por app. Ver
 * ADR 0007 da lib.
 *
 * O reexport existe para os 60 arquivos que já importam `Page` daqui não
 * precisarem mudar de caminho.
 */
export type { Page } from '@xcorpiiion/ng-core';
