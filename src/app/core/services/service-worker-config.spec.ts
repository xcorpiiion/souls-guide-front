import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * O que o service worker confere antes de aceitar uma versão nova.
 *
 * <h2>O defeito</h2>
 * Toda versão tem um `ngsw.json` com o hash de cada arquivo do grupo `app`, e o service worker
 * só troca de versão se **todos** chegarem com esse hash. O `robots.txt` estava no grupo — e o
 * Cloudflare, no domínio, acrescenta ao começo dele o texto do robots.txt gerenciado ("content
 * signals"). O hash nunca batia, o service worker entrava em `EXISTING_CLIENTS_ONLY (Degraded
 * due to: Hash mismatch ... robots.txt)` e seguia servindo a versão que já tinha.
 *
 * <p>O sintoma foi a tela do editor de lore apagado voltando em `soulsguide.com.br` depois de
 * cada deploy, com o servidor sem uma linha dela. No localhost, sem Cloudflare, tudo atualizava
 * — por isso parecia cache do navegador, e Ctrl+Shift+R só adiava.
 *
 * <p>Arquivo que existe para robô de busca não precisa estar offline. Fica fora dos grupos, e
 * este teste impede que o próximo "acrescentar tudo que está em public/" o traga de volta.
 */
const config = JSON.parse(
  readFileSync(join(resolve(process.cwd()), 'ngsw-config.json'), 'utf8'),
) as { assetGroups: { resources: { files?: string[] } }[] };

/** O que passa por borda que reescreve conteúdo: não pode estar num grupo com hash conferido. */
const ALTERADOS_NO_CAMINHO = ['/robots.txt', '/sitemap.xml'];

describe('service worker', () => {
  it('não confere o hash de arquivo que o Cloudflare altera no caminho', () => {
    const conferidos = config.assetGroups.flatMap((g) => g.resources.files ?? []);
    for (const arquivo of ALTERADOS_NO_CAMINHO) {
      expect(conferidos, `${arquivo} num assetGroup trava a atualização no domínio`).not.toContain(
        arquivo,
      );
    }
  });
});
