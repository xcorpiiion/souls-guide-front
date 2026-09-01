import { expect, test } from '@playwright/test';

/**
 * O que o crawler vê — que é HTML cru, sem JavaScript nenhum.
 *
 * Estes testes usam `request.get()` de propósito, e não `page.goto()`: no navegador o
 * JavaScript roda e o título aparece certo mesmo quando o SSR está quebrado. Foi assim
 * que o defeito original passou despercebido — todo link do site aparecia no Discord
 * como "Soulguide" e mais nada, e no DevTools estava tudo certo.
 *
 * É o `curl` do CLAUDE.md, virado teste.
 */
test.describe('o crawler lê a página', () => {
  test('a home sai do servidor com título e descrição próprios', async ({ request }) => {
    const html = await (await request.get('/home')).text();

    expect(html).toContain('<title>');
    // "Soulguide" sozinho era o sintoma: o título da casca, igual em toda página.
    expect(html).toMatch(/<meta name="description" content="[^"]{40,}"/);
  });

  test('a listagem de jogos sai com o título dela, e não com o do site', async ({ request }) => {
    const html = await (await request.get('/games')).text();

    expect(html).toMatch(/<title>Jogos[^<]*<\/title>/);
  });

  test('o preview de link tem og:title, og:description e og:image', async ({ request }) => {
    const html = await (await request.get('/games')).text();

    for (const prop of ['og:title', 'og:description', 'og:image', 'og:url']) {
      expect(html, `faltou ${prop}`).toContain(`property="${prop}"`);
    }
  });

  /**
   * A imagem do preview precisa ser absoluta: o crawler do Discord e o do Google não
   * resolvem caminho relativo, e o card sai sem imagem sem nada quebrar em lugar nenhum.
   */
  test('a og:image é absoluta', async ({ request }) => {
    const html = await (await request.get('/games')).text();
    const url = html.match(/property="og:image" content="([^"]+)"/)?.[1];

    expect(url).toBeDefined();
    expect(url).toMatch(/^https?:\/\//);
  });

  test('o canonical existe e aponta para o domínio, não para o Host da requisição', async ({
    request,
  }) => {
    const html = await (await request.get('/games')).text();
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];

    expect(canonical).toBeDefined();
    expect(canonical).toMatch(/^https?:\/\//);
  });

  /**
   * O `<html lang>` declara o idioma do **conteúdo**, que é português — mesmo com a
   * interface em inglês. É dele que o Chrome parte para oferecer "traduzir esta página",
   * e marcar a página como `en` tiraria a oferta de quem mais precisa dela.
   */
  test('o lang do documento é pt-BR', async ({ request }) => {
    const html = await (await request.get('/home')).text();

    expect(html).toMatch(/<html[^>]+lang="pt-BR"/);
  });

  test('o robots.txt e o sitemap respondem', async ({ request }) => {
    expect((await request.get('/robots.txt')).status()).toBe(200);

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('<urlset');
  });

  /**
   * Área logada é `RenderMode.Client`: o servidor não tem sessão, e renderizar a versão
   * deslogada da tela para jogá-la fora na hidratação é custo sem resultado. O que se
   * afirma aqui é que ela **não** sai pronta, que é o desenho.
   */
  test('a tela de login não é renderizada no servidor', async ({ request }) => {
    const html = await (await request.get('/login')).text();

    expect(html).not.toContain('ngh=');
  });
});
