import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { SITE_URL, SSR_API_BASE } from './core/ssr/api-base';

declare const process: { env: Record<string, string | undefined> };

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),

    // Onde o servidor busca dado enquanto renderiza. No compose é o gateway na rede
    // interna; fora dele, a variável aponta para onde o gateway estiver.
    {
      provide: SSR_API_BASE,
      useValue: process.env['SSR_API_BASE'] ?? 'http://gateway-api:8765',
    },

    // O endereço que o HTML declara como canônico. Não sai do Host da requisição:
    // ver o comentário do token.
    {
      provide: SITE_URL,
      useValue: process.env['SITE_URL'] ?? 'https://soulsguide.com.br',
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
