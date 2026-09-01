import { defineConfig, devices } from '@playwright/test';

/**
 * Os testes que precisam de um navegador de verdade.
 *
 * A suíte do Vitest roda em jsdom e cobre lógica. O que ela **não** consegue ver é
 * exatamente a lista de coisas que este projeto documenta como "o que quebra calado":
 * o HTML que sai do servidor antes de qualquer JavaScript, o service worker, o proxy do
 * nginx e qualquer coisa que dependa de animação — jsdom não tem nenhum dos quatro.
 *
 * Por isso o alvo padrão é o **stack no ar**, e não um `ng serve`: `ng serve` não passa
 * pelo nginx, não serve o service worker e não é a imagem que está publicada. Testar
 * contra ele responderia uma pergunta que ninguém fez.
 */
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4300';

export default defineConfig({
  testDir: './e2e',
  // Um site de leitura: o que interessa é o caminho feliz do visitante, e ele é rápido.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // Falha no CI se alguém esqueceu um `.only` — que silenciosamente reduziria a suíte a
  // um teste sem nada ficar vermelho.
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // O guia é lido no celular, do lado da TV. É o formato que mais importa, e o único
    // em que o menu mobile existe.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
