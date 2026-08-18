import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';

export function initSentry(): void {
  if (!environment.sentryDsn) return;

  // O SDK do Sentry aqui é o de navegador, e este arquivo é importado também pelo
  // bundle de servidor. Iniciá-lo no Node instrumentaria um ambiente que ele não
  // conhece — e erro de renderização de servidor já sai no log do container.
  if (typeof window === 'undefined') return;

  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    tracesSampleRate: environment.production ? 0.2 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
}
