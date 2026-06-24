import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { loadingBarInterceptor } from './core/interceptors/loading-bar.interceptor';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { routes } from './app.routes';
import { initSentry } from './core/services/monitoring.service';

initSentry();

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch(), withInterceptors([loadingBarInterceptor, authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler() },
    { provide: Sentry.TraceService, deps: [Router] },
    {
      provide: APP_INITIALIZER,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true,
    },
  ],
};
