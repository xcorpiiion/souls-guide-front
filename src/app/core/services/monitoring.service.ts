import { Injectable, ErrorHandler } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class SentryErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error(error);
    if (environment.sentryDsn) {
      Sentry.captureException(error);
    }
  }
}
