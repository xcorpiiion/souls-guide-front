import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * O "meu arquivo", na mesa de `/lore` (ADR 0010), abre num navegador de verdade sem erro
 * nenhum no console.
 *
 * <h2>Por que este teste existe</h2>
 * O navegador embutido do app de desenvolvimento não deixa registrar service worker, e a
 * página ali acusava `NG05604` ("Service worker registration failed") — um erro do ambiente,
 * não do site. Olhar o console nesse navegador não separa uma coisa da outra. Este teste
 * separa: no Chromium do Playwright o service worker registra (ver
 * `o-app-instala-e-o-proxy-responde.spec.ts`), e aqui qualquer erro de console ou exceção
 * não tratada na mesa com o arquivo aberto derruba a suíte.
 *
 * <p>É o visitante deslogado: o convite para entrar é a primeira coisa que ele vê na aba, e é
 * a única parte dela que um teste sem conta consegue abrir.
 */

async function jogoDoEscopo(page: Page): Promise<string> {
  const resposta = await page.request.get('/souls-guide-api/games?page=0&size=20');
  expect(resposta.ok(), 'a listagem de jogos não respondeu').toBe(true);
  const pagina = (await resposta.json()) as {
    content: { id: number; slug?: string; dentroDoEscopo?: boolean }[];
  };
  const jogo = pagina.content.find((g) => g.dentroDoEscopo !== false);
  expect(jogo, 'nenhum jogo dentro do escopo para abrir').toBeTruthy();
  return jogo!.slug ?? String(jogo!.id);
}

test.describe('o "meu arquivo" na lore', () => {
  test('abre sem erro de console nem exceção na página', async ({ page }) => {
    const erros: string[] = [];
    page.on('console', (mensagem) => {
      if (mensagem.type() === 'error') erros.push(mensagem.text());
    });
    page.on('pageerror', (erro) => erros.push(erro.message));

    await page.goto(`/lore?jogo=${await jogoDoEscopo(page)}`);
    await page.getByRole('tab', { name: 'meu arquivo' }).click();

    await expect(page.getByRole('heading', { name: 'seu arquivo é só seu' })).toBeVisible();
    // Espera o service worker registrar de fato: conferir o console antes disso daria verde
    // justamente para o erro que este teste existe para pegar.
    await expect
      .poll(
        () => page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)),
        {
          timeout: 20_000,
        },
      )
      .toBeGreaterThan(0);

    expect(erros, 'erros no console da mesa com o arquivo aberto').toEqual([]);
  });

  test('não tem violação de acessibilidade', async ({ page }) => {
    await page.goto(`/lore?jogo=${await jogoDoEscopo(page)}`);
    await page.getByRole('tab', { name: 'meu arquivo' }).click();
    await expect(page.getByRole('heading', { name: 'seu arquivo é só seu' })).toBeVisible();

    const resultado = await new AxeBuilder({ page })
      .include('app-meu-arquivo')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    expect(
      resultado.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([]);
  });
});
