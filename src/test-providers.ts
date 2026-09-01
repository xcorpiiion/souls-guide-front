import { Provider, EnvironmentProviders } from '@angular/core';
import { provideApis } from '@xcorpiiion/ng-core';
import { provideServiceWorker } from '@angular/service-worker';
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

  /**
   * O `SwPush` pela mesma razão do `provideApis` acima: quem o injeta é o `PushService`,
   * que a navbar injeta, que o `App` renderiza — então um spec do componente raiz falha
   * com `NG0201: No provider found for SwPush` sem ter nada a ver com push.
   *
   * `enabled: false` é o que o teste quer de verdade: com ele o `SwPush.isEnabled` é
   * falso, que é o mesmo estado de um navegador sem service worker. Quem precisa
   * exercitar o push de fato substitui o `SwPush` no próprio TestBed, como o
   * `push.service.spec.ts` faz.
   */
  provideServiceWorker('ngsw-worker.js', { enabled: false }),
];

export default providers;
