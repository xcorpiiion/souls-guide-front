import { expect, test } from '@playwright/test';

/**
 * As animações de saída — o que jsdom não tem como ver.
 *
 * `animate.leave` segura o elemento no DOM até a animação terminar. O teste é
 * justamente esse intervalo: fechar e, no quadro seguinte, o nó ainda estar lá. Um
 * teste unitário passaria aqui sem exercitar nada, porque em jsdom não há animação e a
 * remoção é imediata.
 */
test.describe('o menu mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('sai animando em vez de sumir no corte', async ({ page }) => {
    await page.goto('/home');

    const abrir = page.locator('.navbar__burger, [aria-label*="menu" i]').first();
    await abrir.click();

    const menu = page.locator('.navbar__mobile');
    await expect(menu).toBeVisible();

    await abrir.click();

    // Ainda no DOM, com a classe de saída: é o que `animate.leave` garante e o que o
    // CSS sozinho não conseguia fazer.
    await expect(menu).toHaveClass(/sg-leave-slide/);

    // E some depois que a animação termina.
    await expect(menu).toHaveCount(0, { timeout: 3_000 });
  });
});

/**
 * A troca de rota passa pela View Transitions API. O que se afirma aqui não é a
 * aparência — é que a API é de fato acionada, e que a capa tem nome único: dois
 * elementos com o mesmo `view-transition-name` abortam a transição inteira, calados.
 */
test.describe('a transição de rota', () => {
  test('só um card carrega o nome da transição', async ({ page }) => {
    await page.goto('/games');

    // Esperar o card existir, e não perguntar antes: no mobile a lista chega um pouco
    // depois, e um `count()` prematuro fazia o teste se pular sozinho — que é o modo de
    // falha pior, porque a suíte fica verde sem ter afirmado nada.
    const primeiro = page.locator('.game-card__btn').first();
    await expect(primeiro).toBeVisible();

    await expect(page.locator('[data-vt="capa"]')).toHaveCount(0);

    await primeiro.click();
    await expect(page.locator('[data-vt="capa"]')).toHaveCount(1);
  });
});
