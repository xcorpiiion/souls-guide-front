import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  UNSAVED_CHANGES_TEXT,
  authInterceptor,
  loadingBarInterceptor,
  provideApis,
  provideAuth,
} from '@xcorpiiion/ng-core';
import {
  provideRouter,
  Router,
  withComponentInputBinding,
  withNavigationErrorHandler,
} from '@angular/router';
import * as Sentry from '@sentry/angular';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { initSentry } from './core/services/monitoring.service';
import { recarregarSeBundleVelho } from './core/stale-bundle';
import { baseAbsolutaNoServidor } from './core/ssr/api-base';
import { provideClientHydration } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';

initSentry();

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    // `baseAbsolutaNoServidor` vem primeiro porque reescreve a URL; os outros dois
    // mexem em cabeçalho e em estado de tela. No navegador ele não faz nada.
    provideHttpClient(
      withFetch(),
      withInterceptors([baseAbsolutaNoServidor, loadingBarInterceptor, authInterceptor]),
    ),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Aba aberta durante um deploy fica com o main.js velho na memória,
      // pedindo chunks que o build novo apagou. A navegação falha em 404 e a
      // tela simplesmente não troca. Só recarregar resolve — o index.html não
      // é cacheado justamente para isso funcionar.
      withNavigationErrorHandler((e) => recarregarSeBundleVelho(e.error)),
    ),

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

    // As quatro APIs do stack, nomeadas. O `environment` é lido aqui, uma
    // vez: `ng-core` não pode importá-lo, senão deixa de compilar em qualquer
    // projeto que nomeie as coisas de outro jeito.
    //
    // Em `environment.container.ts` estas bases são caminhos relativos
    // (`/souls-guide-api`), e não URLs — é o que faz um mesmo bundle servir
    // localhost, o IP da LAN e a URL do túnel, com o nginx do front fazendo o
    // proxy. Base desconhecida ou `defaultBase` fora da lista estouram na
    // subida, não na primeira chamada.
    provideApis({ bases: environment.apis, defaultBase: 'soulsGuide' }),

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
    provideClientHydration(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
