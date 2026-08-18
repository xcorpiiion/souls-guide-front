import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

/**
 * O motor de renderização.
 *
 * <h2>Por que `allowedHosts` é curinga aqui</h2>
 * A proteção existe para o caso em que o servidor usa o cabeçalho `Host` para montar
 * URL — aí um Host forjado faz o servidor buscar (ou declarar) o endereço de outra
 * pessoa. **Neste app nada é derivado do Host:** a base da API vem de `SSR_API_BASE` e o
 * domínio canônico do `<link rel="canonical">` vem de `SITE_URL`, as duas variáveis de
 * ambiente, e as duas com valor fixo no compose.
 *
 * Listar hosts, aqui, tiraria zero risco e quebraria dois acessos legítimos: o IP da LAN
 * (que muda de máquina para máquina) e a URL sorteada do quick tunnel, que muda a cada
 * subida do container. `SSR_ALLOWED_HOSTS` existe para quem quiser fechar assim mesmo.
 *
 * Este processo também não publica porta: quem o alcança é o nginx do front, dentro da
 * rede do compose.
 */
const angularApp = new AngularNodeAppEngine({
  allowedHosts: (process.env['SSR_ALLOWED_HOSTS'] ?? '*').split(',').map((h) => h.trim()),
});

/**
 * Os arquivos estáticos são servidos pelo nginx, que chega neles antes. Isto aqui é o
 * caminho de quem roda o servidor sozinho — `node dist/soulguide/server/server.mjs` na
 * máquina, sem nginx na frente.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Sonda de vida, para o healthcheck do compose.
 *
 * Não passa pelo Angular de propósito: renderizar uma página para dizer que o processo
 * está vivo mede o tempo do render, e um render lento derrubaria o container justamente
 * quando ele está sob carga.
 */
app.get('/healthz', (_req, res) => {
  res.json({ status: 'UP' });
});

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`SSR do SoulGuide ouvindo em http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
