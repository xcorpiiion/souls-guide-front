import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  UNSAVED_CHANGES_TEXT,
  authInterceptor,
  loadingBarInterceptor,
  provideAuth,
} from '@xcorpiiion/ng-core';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { initSentry } from './core/services/monitoring.service';

initSentry();

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch(), withInterceptors([loadingBarInterceptor, authInterceptor])),
    provideRouter(routes, withComponentInputBinding()),

    // O que a lib não pode adivinhar: onde fica a auth-api, com que nome os
    // tokens são guardados e para onde mandar quem caiu da sessão. As chaves
    // continuam `sg_*` — trocar agora deslogaria todo mundo que já está com
    // sessão aberta no navegador.
    provideAuth({
      baseUrl: `${environment.apis.auth}/auth`,
      accessTokenKey: 'sg_access_token',
      refreshTokenKey: 'sg_refresh_token',
      loginRoute: '/login',
      logoutRoute: '/home',
      sessionExpiredNotice: {
        title: 'Sessão expirada',
        message: 'Faça login novamente para continuar.',
      },
    }),

    {
      provide: UNSAVED_CHANGES_TEXT,
      useValue: {
        title: 'Alterações não salvas',
        message: 'Você tem alterações que não foram salvas. Deseja sair mesmo assim?',
        confirmLabel: 'Sair sem salvar',
        cancelLabel: 'Continuar editando',
      },
    },

    // O `provideErrorReporting` da lib existe para quem não tem nada montado.
    // Aqui o handler nativo do Sentry já faz mais — contexto de Angular e
    // encadeamento de causa — então ele fica.
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
