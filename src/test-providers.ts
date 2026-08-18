import { Provider, EnvironmentProviders } from '@angular/core';
import { provideApis } from '@xcorpiiion/ng-core';
import { environment } from './environments/environment';

/**
 * Providers aplicados ao ambiente de teste, via `providersFile` no
 * `angular.json`.
 *
 * O `HttpService` resolve a base da API por injeção, então todo service que o
 * usa precisa do `provideApis` — inclusive nos testes de componente, que
 * injetam service de forma indireta e não montam o `app.config.ts`. Sem isto,
 * 44 testes falhavam com `NG0201: No provider found for InjectionToken
 * pf.api.config`, e a alternativa era repetir a linha em cada um dos 32
 * arquivos de spec.
 *
 * As bases são as do `environment` de desenvolvimento, as mesmas que os specs
 * já usam para montar a URL esperada — é o que mantém
 * `http.expectOne(`${BASE}/games`)` valendo sem reescrever asserção nenhuma.
 */
const providers: (Provider | EnvironmentProviders)[] = [
  provideApis({ bases: environment.apis, defaultBase: 'soulsGuide' }),
];

export default providers;
