import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';

export function initSentry(): void {
  if (!environment.sentryDsn) return;

  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    tracesSampleRate: environment.production ? 0.2 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
}
