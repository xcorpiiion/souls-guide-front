import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * O site é utilizável por quem não enxerga a tela.
 *
 * <h2>Por que isto, e não Lighthouse</h2>
 * O que o Lighthouse traria de SEO e de PWA já está travado, com mais precisão, em
 * `o-crawler-le-a-pagina.spec.ts` e `o-app-instala-e-o-proxy-responde.spec.ts`: aqueles
 * usam `request.get()` e conferem o HTML **cru**, que é o que o crawler lê. O Lighthouse
 * avalia a página renderizada — que é exatamente onde o defeito original **não** aparecia.
 *
 * O que faltava era acessibilidade, e ela não é detalhe num site cujo conteúdo é texto
 * longo lido enquanto se joga: contraste ruim, botão de ícone sem nome, ou um `<h3>` antes
 * do `<h2>` transformam um guia em algo que o leitor de tela lê fora de ordem.
 *
 * <h2>O que este teste NÃO promete</h2>
 * Ferramenta automática pega da ordem de um terço das barreiras reais. Passar aqui quer
 * dizer "sem as falhas que dá para encontrar sozinho", não "acessível". As outras duas
 * partes se encontram usando o site com o teclado e com um leitor de tela, e isso nenhum
 * teste substitui.
 */

/** As páginas que um visitante deslogado alcança, e que carregam o conteúdo do site. */
const PAGINAS = [
  { nome: 'home', url: '/home' },
  { nome: 'listagem de jogos', url: '/games' },
];

/**
 * `wcag2a`/`wcag2aa` são o conjunto que a maior parte da legislação referencia.
 * `best-practice` entra porque é onde moram as duas coisas que mais quebram num site de
 * conteúdo: ordem de cabeçalho e região de marco (`<main>`, `<nav>`).
 */
const REGRAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

/**
 * A DÍVIDA CONHECIDA — e por que ela é uma lista nomeada, e não um teto numérico.
 *
 * Quando este teste entrou, ele acusou contraste insuficiente em cinco lugares. Dois foram
 * corrigidos na hora (o "sem série" do card, que era texto informativo em 1,83:1, e a marca
 * d'água, que ganhou `aria-hidden`). Os outros pedem decisão de paleta, e um deles nem mora
 * neste repositório — `pf-select__placeholder` vem da lib `platform-front`.
 *
 * Congelar a dívida é a única forma de adotar a verificação sem parar tudo. Mas um teto
 * ("no máximo 5 violações") aceitaria trocar uma barreira por outra sem ninguém notar — o
 * mesmo defeito que o teste de N+1 do back-end evita comparando duas execuções em vez de
 * fixar um número.
 *
 * Por isso a lista é **por seletor, com motivo**, e ela **se limpa sozinha**: se um item
 * daqui deixar de violar, o teste falha pedindo que a linha saia. Lista de exceção que
 * ninguém remove é como um teto envelhece.
 */
const DIVIDA_DE_CONTRASTE: { seletor: string; motivo: string }[] = [
  {
    seletor: '.game-card__short',
    motivo:
      "Marca d'água decorativa: o nome curto a 15% de opacidade, atrás do banner. Já tem " +
      'aria-hidden (o nome de verdade está no <h2> ao lado), mas o axe checa contraste de ' +
      'texto visível mesmo assim. A WCAG isenta texto incidental; subir a opacidade até ' +
      'passar faria dela um segundo título.',
  },
  {
    seletor: '.quest-item__tag',
    motivo: 'Tag da listagem de quests. Pede decisão de paleta.',
  },
  {
    seletor: '.lore-item__badge',
    motivo: 'Selo de tipo do artigo de lore. Pede decisão de paleta.',
  },
  {
    seletor: '.home__lore-intro',
    motivo:
      'Texto de apoio da home: `text-muted` sobre `bg-elevated`. O mesmo token passa sobre ' +
      'o fundo padrão e reprova sobre o elevado — é o par que precisa mudar, não a cor.',
  },
  {
    seletor: '.pf-select__placeholder',
    motivo:
      'Vem da lib platform-front, não deste repositório. A correção é lá, e alcança todo ' +
      'consumidor de uma vez.',
  },
];

/** Um nó só conta como dívida se casar com um seletor da lista acima. */
function daDivida(alvo: string): boolean {
  return DIVIDA_DE_CONTRASTE.some((d) => alvo.includes(d.seletor));
}

test.describe('o site é navegável por quem não vê', () => {
  for (const pagina of PAGINAS) {
    test(`${pagina.nome} não tem violação de acessibilidade nova`, async ({ page }) => {
      await page.goto(pagina.url);
      // O conteúdo chega do servidor, mas a hidratação ainda mexe no DOM. Analisar antes
      // dela mediria uma página que ninguém vê.
      await page.waitForLoadState('networkidle');

      const resultado = await new AxeBuilder({ page }).withTags(REGRAS).analyze();

      const novas = resultado.violations.flatMap((v) =>
        v.nodes
          .map((n) => n.target.join(' '))
          .filter((alvo) => !(v.id === 'color-contrast' && daDivida(alvo)))
          .map((alvo) => `${v.id} (${v.impact}) em ${alvo}\n      ${v.help}`),
      );

      expect(novas, `violação nova em ${pagina.url}:\n\n${novas.join('\n\n')}`).toEqual([]);
    });
  }

  /**
   * Separado das regras acima de propósito: contraste é a única barreira que muda com o
   * TEMA, e este site tem dois. Uma paleta que passa no claro pode reprovar no escuro sem
   * mais nada mudar na página.
   */
  test('o contraste do tema escuro não piorou', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/games');
    await page.waitForLoadState('networkidle');

    const resultado = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
    const novas = resultado.violations
      .filter((v) => v.id === 'color-contrast')
      .flatMap((v) => v.nodes.map((n) => n.target.join(' ')))
      .filter((alvo) => !daDivida(alvo));

    expect(novas, `contraste novo insuficiente no tema escuro:\n${novas.join('\n')}`).toEqual([]);
  });

  /**
   * A outra metade da lista de dívida, e a que impede ela de virar folclore.
   *
   * Item que deixou de violar tem que SAIR daqui. Sem esta verificação, a lista viraria uma
   * coleção de exceções que ninguém revisita — e a próxima barreira de verdade entraria
   * embaixo de um seletor que já nem existe mais.
   */
  test('a lista de dívida não tem item já resolvido', async ({ page }) => {
    const aindaViolam = new Set<string>();

    for (const pagina of PAGINAS) {
      await page.goto(pagina.url);
      await page.waitForLoadState('networkidle');

      const resultado = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
      for (const v of resultado.violations.filter((x) => x.id === 'color-contrast')) {
        for (const n of v.nodes) {
          const alvo = n.target.join(' ');
          DIVIDA_DE_CONTRASTE.filter((d) => alvo.includes(d.seletor)).forEach((d) =>
            aindaViolam.add(d.seletor),
          );
        }
      }
    }

    const resolvidos = DIVIDA_DE_CONTRASTE.map((d) => d.seletor).filter((s) => !aindaViolam.has(s));

    expect(
      resolvidos,
      `estes seletores não violam mais e devem sair de DIVIDA_DE_CONTRASTE:\n  ${resolvidos.join('\n  ')}`,
    ).toEqual([]);
  });
});
