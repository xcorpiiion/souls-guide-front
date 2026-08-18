import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';

/**
 * A base absoluta das APIs enquanto o servidor renderiza. Só é fornecida no
 * `app.config.server.ts` — no navegador ela não existe, e o interceptor não faz nada.
 */
export const SSR_API_BASE = new InjectionToken<string>('ssr.api.base');

/**
 * A origem canônica do site, durante a renderização de servidor.
 *
 * Só existe no servidor. No navegador o `SeoService` usa a origem de verdade — é ela que
 * faz o link do ambiente local apontar para o ambiente local.
 *
 * Existe porque o `<link rel="canonical">` e a `og:url` não podem sair do cabeçalho
 * `Host` da requisição: quem manda o Host é o cliente, e um Host forjado faria o site
 * declarar como canônica uma URL de outro domínio — o buscador acredita, e o resultado é
 * o conteúdo indexado no endereço de outra pessoa. É a mesma decisão do
 * `SitemapAssembler`, no back-end: domínio canônico é configuração, não observação.
 */
export const SITE_URL = new InjectionToken<string>('site.url');

/**
 * Torna absoluta, no servidor, a URL que o navegador resolve sozinho.
 *
 * O front chama `/souls-guide-api/...` de propósito: caminho relativo é o que faz um
 * mesmo bundle servir localhost, o IP da LAN e a URL do túnel, com o nginx fazendo o
 * proxy. No Node não existe origem para resolver contra — `fetch('/souls-guide-api/x')`
 * falha em "Failed to parse URL", e a página renderizaria vazia.
 *
 * O destino é o gateway **dentro da rede do compose**, e não o endereço público: a
 * renderização sairia da máquina, atravessaria o túnel e voltaria, para buscar um dado
 * que está no container ao lado.
 */
export const baseAbsolutaNoServidor: HttpInterceptorFn = (req, next) => {
  const base = inject(SSR_API_BASE, { optional: true });

  if (!base || /^https?:\/\//i.test(req.url)) return next(req);

  return next(req.clone({ url: `${base}${req.url.startsWith('/') ? '' : '/'}${req.url}` }));
};
