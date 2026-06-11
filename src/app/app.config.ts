import { ApplicationConfig, ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { SentryErrorHandler, initSentry } from './core/services/monitoring.service';

initSentry();

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: ErrorHandler, useClass: SentryErrorHandler },
  ],
};
