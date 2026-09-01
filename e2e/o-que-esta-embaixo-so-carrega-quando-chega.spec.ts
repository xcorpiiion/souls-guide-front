import { expect, test } from '@playwright/test';

/**
 * O `@defer (on viewport)` da seção de comentários, com o `IntersectionObserver` de
 * verdade.
 *
 * A suíte unitária cobre este bloco com `DeferBlockBehavior.Manual`, que dispara o
 * gatilho na mão — ela afirma que o bloco existe e que renderiza quando mandado, e é o
 * máximo que jsdom permite, porque lá não há viewport nem observer. O que falta é o
 * gatilho em si: que a seção **não** venha antes, e que a rolagem a traga.
 *
 * A quest sai da própria API, e não fixa no teste: id chumbado quebra no dia em que o
 * acervo muda, e o erro fala de 404, não de conteúdo.
 */
test.describe('a seção de comentários', () => {
  test('só carrega quando a rolagem chega nela', async ({ page, request }) => {
    const lista = await (await request.get('/souls-guide-api/quests?page=0&size=1')).json();
    const quest = lista.content?.[0];
    test.skip(!quest, 'não há quest publicada neste ambiente');

    await page.goto(`/games/${quest.gameId}/quests/${quest.id}`);

    // O topo da página está pronto...
    await expect(page.locator('.quest-detail__title')).toBeVisible();

    // ...e a seção lá embaixo ainda não foi paga.
    await expect(page.locator('app-comment-section')).toHaveCount(0);
    await expect(page.locator('.comentarios-reserva')).toHaveCount(1);

    await page.locator('.comentarios-reserva').scrollIntoViewIfNeeded();

    await expect(page.locator('app-comment-section')).toHaveCount(1);
    await expect(page.locator('.comentarios-reserva')).toHaveCount(0);
  });
});
