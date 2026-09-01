# ADR 0005 — O que o jsdom não vê tem teste de navegador, contra o stack no ar

- **Status:** Aceita
- **Data:** 01/09/2026
- **Trava:** e2e/o-crawler-le-a-pagina.spec.ts

## Problema

A suíte do Vitest roda em jsdom e cobre lógica: signals, computed, transformação, forma do
JSON. O que ela nunca conseguiu ver é exatamente a lista que o `CLAUDE.md` chama de "o que
quebra calado" — e todos os itens dessa lista já quebraram de verdade:

- **o HTML que sai do servidor.** Todo link do site aparecia no Discord como "Soulguide" e
  mais nada. No DevTools estava tudo certo, porque lá o JavaScript roda e o título aparece
  mesmo com o SSR quebrado. O `curl` era o único jeito de ver o que o crawler vê, e ninguém
  roda `curl` a cada commit;
- **o service worker.** `ngsw-worker.js` e `ngsw.json` não têm hash no nome; se a regra de
  assets do nginx os pegar, vão com `immutable` por um ano e o app **para de atualizar para
  sempre**, sem nada quebrar hoje;
- **o proxy do nginx.** É ele que faz o túnel cobrir site e API na mesma origem. Quebrado,
  derruba o site inteiro para quem vem de fora;
- **qualquer coisa que dependa de animação ou de viewport.** jsdom não tem nenhuma das duas,
  então `animate.leave` e `@defer (on viewport)` passariam num teste unitário sem exercitar
  nada — o formato de teste que fica verde por não ter chegado ao ponto.

## Decisão

Uma suíte de Playwright em `e2e/`, rodando contra o **stack no ar** — a imagem publicada,
servida pelo nginx, com o SSR e o service worker de verdade.

O alvo é `http://localhost:4300` por padrão, configurável por `E2E_BASE_URL`. São dois
projetos: `chromium` e `mobile` (Pixel 7), porque o guia é lido no celular do lado da TV e
é lá que o menu mobile existe.

Os testes de SSR usam `request.get()` e **não** `page.goto()`, de propósito: no navegador o
JavaScript roda e mascara o defeito. É o `curl` do `CLAUDE.md` virado teste.

## Consequências

Ficou possível afirmar coisas que antes só se conferia à mão, e duas delas já apareceram na
primeira execução: `/.well-known/routes` responde **401 na borda** (que é o desenho — o
gateway busca esse documento na rede do compose, e publicá-lo na borda entregaria a tabela
de roteamento inteira), e um teste do mobile **se pulava sozinho** porque perguntava o
`count()` antes de a lista chegar — suíte verde sem ter afirmado nada.

Ficou mais caro em pré-requisitos: a suíte **exige o stack no ar** e a imagem reconstruída.
Rodá-la contra código que ainda não virou imagem testa a versão anterior e mente. Isso é
deliberado — testar contra `ng serve` responderia uma pergunta que ninguém fez, porque
`ng serve` não passa pelo nginx, não serve o service worker e não é o que está publicado.

Passou a ser proibido considerar "verde" um `ng test` sozinho para mudança que toque SSR,
service worker, nginx, animação de saída ou `@defer`.

O `@Chromium` do Playwright acrescenta ~150 MB à máquina de quem for rodar, e o
`npx playwright install chromium` passa a ser um passo em máquina nova.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Browser mode do Vitest | Cobriria o mesmo vão (jsdom sem layout, sem observer, sem animação) dobrando o tempo da suíte unitária — e ainda contra o bundle de desenvolvimento, não contra a imagem publicada. O vão que importa é o da imagem servida pelo nginx |
| Manter o `curl` do `CLAUDE.md` | Depende de alguém lembrar de rodar, e o defeito do preview de link durou semanas justamente porque ninguém lembrou |
| Rodar contra `ng serve` | Não passa pelo nginx, não serve o service worker, não é a imagem publicada. Passaria com o site quebrado no ar |
| Subir o stack dentro do Playwright (`webServer`) | O compose leva minutos e depende do Docker Desktop dentro da sessão do usuário. A suíte roda em segundos contra o que já está de pé, que é o estado normal desta máquina |
| Cypress | Sem projeto mobile de verdade, e o `request.get()` do Playwright — que é o coração dos testes de SSR aqui — não tem equivalente direto |

## Referências

- `playwright.config.ts`
- `e2e/o-crawler-le-a-pagina.spec.ts` — o que o crawler lê, sem JavaScript
- `e2e/o-app-instala-e-o-proxy-responde.spec.ts` — PWA e proxy do nginx
- `e2e/a-gaveta-nao-some-no-corte.spec.ts` — `animate.leave` e a transição de rota
- `e2e/o-que-esta-embaixo-so-carrega-quando-chega.spec.ts` — `@defer (on viewport)` com `IntersectionObserver` real
- [ADR 0009 do back-end](../../../../Back-end/soulsguide/docs/adr/0009-o-html-do-conteudo-sai-do-servidor.md) — por que existe SSR
