// Antes de tudo: o bundle de servidor importa código que assume navegador.
// Ver src/ssr-globals.ts — o import precisa vir primeiro, e por isso está isolado
// num arquivo em vez de ser uma linha solta aqui, que qualquer organizador de
// imports moveria para baixo sem ninguém notar.
import './ssr-globals';

import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);

export default bootstrap;
