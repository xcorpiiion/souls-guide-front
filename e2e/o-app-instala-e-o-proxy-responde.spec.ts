import { expect, test } from '@playwright/test';

/**
 * O que só existe na imagem servida pelo nginx: o PWA e o proxy das APIs.
 *
 * Nada disto aparece num `ng serve`, e nada disto é exercitado pela suíte do Vitest.
 */
test.describe('o app instala', () => {
  test('o manifest está ligado e é válido', async ({ page, request }) => {
    await page.goto('/home');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();

    const manifest = await (await request.get(href!)).json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    // Sem `display: standalone` o site "instala" e abre dentro do navegador, com a
    // barra de endereço — que é o mesmo que não instalar.
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.length ?? 0).toBeGreaterThan(0);
  });

  test('o service worker é registrado', async ({ page }) => {
    await page.goto('/home');

    await expect
      .poll(
        () => page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)),
        {
          timeout: 20_000,
        },
      )
      .toBeGreaterThan(0);
  });

  /**
   * `ngsw-worker.js` e `ngsw.json` não têm hash no nome. Se a regra de assets do nginx
   * os pegar, eles vão com `immutable` por um ano — e o app para de atualizar para
   * sempre, sem nada quebrar hoje.
   */
  test('o worker e o manifesto do worker não são cacheados', async ({ request }) => {
    for (const arquivo of ['/ngsw-worker.js', '/ngsw.json']) {
      const resposta = await request.get(arquivo);
      expect(resposta.status(), `${arquivo} não respondeu`).toBe(200);
      expect(resposta.headers()['cache-control'] ?? '', `${arquivo} está cacheado`).toContain(
        'no-cache',
      );
    }
  });
});

/**
 * O túnel aponta para o front, e é o nginx dele que faz o proxy das APIs — é isso que
 * faz uma URL só cobrir site e API, na mesma origem, sem CORS no caminho. Proxy quebrado
 * derruba o site inteiro para quem vem de fora, e não aparece em teste unitário nenhum.
 */
test.describe('o nginx faz o proxy das APIs', () => {
  test('a API do souls-guide responde na origem do site', async ({ request }) => {
    const resposta = await request.get('/souls-guide-api/games?page=0&size=1');

    expect(resposta.status()).toBe(200);
    expect(await resposta.json()).toHaveProperty('content');
  });

  /**
   * O contrário do que parece: a descoberta de rotas **não** pode ser alcançável de fora.
   *
   * `/.well-known/routes` é o documento que o gateway busca para saber quais rotas do
   * serviço são públicas, e ele o busca dentro da rede do compose, na porta do serviço —
   * onde responde 200. Na borda ele é infraestrutura do serviço, como o Swagger e o
   * actuator, e a borda é o que o túnel alcança: publicá-lo entregaria a tabela de
   * roteamento inteira, fechadas incluídas, para qualquer um.
   *
   * 401 aqui é o desenho funcionando, não uma falha de configuração.
   */
  test('a descoberta de rotas não é republicada na borda', async ({ request }) => {
    const resposta = await request.get('/souls-guide-api/.well-known/routes');

    expect(resposta.status()).toBe(401);
  });
});
