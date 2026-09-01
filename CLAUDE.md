# SoulGuide — CLAUDE.md

Arquivo de instruções para o Claude Code. Leia antes de qualquer ação.
Leia também `.claude/rules.md` para regras de código detalhadas.

Para **por que** cada decisão é assim, ver `docs/adr/`; para o desenho do front,
`docs/arquitetura/`; para quando algo quebrar na tela, `docs/runbooks/`.

---

## O projeto

SoulGuide é um site colaborativo de guias para souls-likes (Elden Ring, Dark Souls III, Bloodborne, Lies of P, Lords of the Fallen).
Projeto pessoal/portfólio, sem fins financeiros.

---

## Stack

- **Frontend:** Angular 22, Zoneless, SCSS, Signals, Standalone, OnPush
- **TypeScript:** 6.0 — o Angular 22 fixa `>=6.0 <6.1`, então a 7.0 ainda não entra
- **Node:** 24 LTS — o Angular 22 exige `^22.22.3 || ^24.15.0 || >=26`, e o `ng` recusa rodar abaixo disso
- **Testes:** Vitest
- **Grafo de quest:** SVG desenhado à mão, com o layout em `shared/utils/mini-graph.ts`.
  Não é `bpmn-js` — ele esteve no `package.json` até 01/09/2026 sem um único import no
  `src/`, 6,1 MB de dependência que nada carregava, e saiu
- **Drag-drop:** @angular/cdk@22
- **CI/CD:** GitHub Actions + SonarCloud (repo público, free)
- **Backend:** existe e está no ar — `souls-guide-api` (8095), `authorization-api`, `user-api` e
  `storage-api`, todos atrás do gateway na 8765. A fase mock-first acabou

---

## Ambientes e build da imagem

| Configuração | Environment | Quem usa |
|---|---|---|
| `development` | `environment.ts` — `http://localhost:8765` | `ng serve` na sua máquina |
| `container` | `environment.container.ts` — caminhos relativos | a imagem Docker (`Dockerfile`) |
| `production` | `environment.prod.ts` — Cloud Run | deploy antigo no Cloud Run |

A imagem usa `container` porque host fixo no bundle é decidido em build time: com
`http://localhost:8765` embutido, o site só funciona no navegador da própria máquina —
de outro dispositivo ou por um túnel, `localhost` é o aparelho de quem acessa. Com
caminho relativo, quem serve o HTML também serve a API: o `nginx.conf` desta pasta faz
proxy para o `gateway-api` dentro da rede do compose, e o mesmo build atende localhost,
o IP da LAN e a URL pública, sem CORS no caminho.

`nginx-proxy-comum.inc` guarda os cabeçalhos de proxy repetidos. `proxy_buffering off`
não é detalhe: as notificações chegam por SSE, e com buffering o navegador só recebe os
eventos quando a conexão cai.

---

## Estrutura de pastas (Frontend)

```
src/
  app/
    core/             # guards, interceptors, services singleton
    shared/           # componentes, pipes, directives reutilizáveis
      components/
      pipes/
      directives/
      models/         # interfaces e types globais
    features/        # uma pasta por tela, no plano — 24 hoje. As principais:
      home/
      games/  game-detail/
      quests/         # listagem, com filtro por jogo e status
      quest-detail/  quest-editor/  quest-conditions/  quest-map-organizer/
      rotas/  game-create/  not-found/
      lore/           # artigos de lore com sistema de status
      lore-create/  lore-editor/  lore-history/
      ending-detail/  # guia de final: passos por capítulo, inclusive AVOID
      profile/        # perfil do usuário, meus guias, doações
      usuario/  comunidade/  search/  login/  forgot-password/  reset-password/
    layout/
      navbar/
      sidebar/
      footer/
  styles/
    _variables.scss   # variáveis globais já criadas
    _reset.scss
    _typography.scss
  assets/
```

---

## Regras de código

- Standalone components, OnPush, Signals — ver `.claude/rules.md` para detalhes
- **Contratos de API**: os shapes de request/response vêm da lib `@xcorpiiion/canonico` (tipos TS gerados dos DTOs Java do back-end). Os arquivos em `shared/models` apenas re-exportam/estreitam esses tipos e mantêm os view models do front. Nunca redeclarar um shape de API à mão — se o contrato mudou, atualizar a versão do pacote (`npm update @xcorpiiion/canonico`).
- Componentes grandes → dividir. Limite: ~200 linhas de HTML, ~150 de SCSS, ~100 de TS
- Todo componente e service criado deve ter arquivo `.spec.ts`
- Dados vêm dos services em `core/services`, não de mock. Onde ainda não há endpoint, o dado
  fica num `*.mocks.ts` ao lado do componente — nunca inline. Hoje só `profile.ts` depende de
  um (`MY_PROFILE`, como valor inicial do signal); os outros `*.mocks.ts` sobraram para os specs
- SCSS via `@use 'styles/variables' as v` e `@use 'styles/mixins' as m`
- Nunca `any`, nunca Zone.js, nunca style inline

---

## Modelos principais

```typescript
// Quest node — nó do grafo de quests
interface QuestNode {
  id: string;
  title: string;
  description: string;
  location: string;
  npcDialogues: NpcDialogue[];
  loreContext: string;
  gameId: string;
  questGuideId: string;
}

// Aresta entre nós — define fluxo e condições
interface QuestEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: string; // ex: "Se Blaidd estiver vivo"
  isCritical: boolean; // se falhar, quebra a quest
}

// Artigo de lore
interface LoreArticle {
  id: string;
  title: string;
  content: string;
  status: 'TEORIA' | 'CONSOLIDADO' | 'CANONICO';
  upvotes: number;
  linkedQuestNodeIds: string[];
  gameId: string;
  authorId: string;
}

// Progresso pessoal do usuário
interface UserProgress {
  userId: string;
  questGuideId: string;
  completedNodeIds: string[];
  currentNodeId: string;
}
```

---

## Conceitos importantes do produto

**Kanban vs BPMN:**

- Kanban = progresso pessoal ("onde eu estou") — colunas: A fazer / Em progresso / Concluído
- BPMN = jornada completa ("como o mundo funciona") — grafo com quests interconectadas, decisões e consequências
- Ambos compartilham os mesmos `QuestNode` — só a visualização muda

**Sistema de Lore:**

- Artigos nascem como `TEORIA`
- Sobem para `CONSOLIDADO` com upvotes da comunidade
- O mais votado do tema vira `CANONICO`
- Itens NÃO têm seção própria — existem apenas como citações dentro de artigos de lore

**Colaboração:**

- Usuário pode criar guia do zero ou clonar um existente
- Clones podem ser mesclados de volta ao original (versionamento)

---

## Fluxo obrigatório por etapa

**Toda implementação deve seguir essa ordem — sem exceção:**

1. Implementar o código
2. Escrever os testes (`.spec.ts`) na mesma etapa
3. Só então reportar como concluído

Nunca deixar testes para depois. Se uma etapa não tiver testes, ela não está pronta.

---

## O que NÃO fazer

- Não redeclarar shape de API à mão — vem do `@xcorpiiion/canonico`
- Não derivar URL do cabeçalho `Host` no SSR — ver `docs/adr/` e o ADR 0009 do back-end
- Não listar hosts em `allowedHosts` — quebra o IP da LAN e a URL do quick tunnel
- Não redeclarar `serviceWorker` só em `production` no `angular.json` — a imagem usa `container`
- Não cachear `ngsw-worker.js`, `ngsw.json` nem `index.html` com hash longo
- Não editar ADR já aceito — decisão que mudou vira um ADR novo
- Não usar localStorage para estado sensível
- Não commitar chaves de API ou senhas
- Não criar componente sem SCSS próprio
- Não criar componente sem spec correspondente
- Não usar Zone.js
- Não usar `any`

---

## O site sai renderizado do servidor, e instala como aplicativo

Três coisas que este repositório ganhou em 18/08/2026, e que mudam como ele é servido:

| Peça | Onde | Para quê |
|---|---|---|
| `SeoService` | `core/services/seo.service.ts` | título, descrição, OG, Twitter card, `canonical` e JSON-LD por página |
| SSR | `src/server.ts`, `src/app/app.routes.server.ts` | o crawler de preview **não executa JavaScript**: sem isto todo link do site aparece no Discord como "Soulguide" e mais nada |
| PWA | `ngsw-config.json`, `public/manifest.webmanifest` | um guia é lido enquanto se joga, no celular do lado — o app instala e o conteúdo visitado abre sem rede |

O porquê de cada decisão, e o que foi descartado, está no
[ADR 0009 do back-end](../../Back-end/soulsguide/docs/adr/0009-o-html-do-conteudo-sai-do-servidor.md) —
a decisão é uma só e atravessa os dois repositórios, então ela não é copiada para cá.

### O que quebra calado

- **O cabeçalho da página tem que ser aplicado quando o dado chega**, não no `ngOnInit`:
  montado antes da resposta, o que o crawler lê é "Carregando".
- **O `SeoService` remove as tags que administra antes de pôr as novas.** Sem isso, sair
  de uma página com capa para outra sem capa deixa a capa anterior no `<head>`, e o link
  compartilhado sai com a imagem da quest errada.
- **O bundle de servidor importa código que assume navegador.** Hoje é o `localStorage`
  do `@xcorpiiion/ng-core`; `src/ssr-globals.ts` é o contorno, e ele precisa ser o
  **primeiro** import de `src/main.server.ts`.
- **`serviceWorker` está declarado nas duas configurações do `angular.json`.** O
  schematic só põe em `production`, e a imagem é buildada com `--configuration=container`.
- **Duas imagens saem do mesmo Dockerfile**, por `--target web` e `--target ssr`. Sem o
  `--target`, o `docker build` constrói o último estágio e publica o Node no lugar do nginx.

### Rodar e conferir

```bash
npm run build -- --configuration=container
node dist/soulguide/server/server.mjs      # PORT, SSR_API_BASE e SITE_URL por variável
```

```bash
curl -s http://localhost:4300/games/17/quests/45 | grep -E "<title>|og:title"
```

O `curl` é o único jeito de ver o que o crawler vê: no DevTools o JavaScript roda e o
título aparece certo mesmo quando o SSR está quebrado.

---

## Idioma: a interface traduz, o conteúdo não

A interface fala português e inglês. O **conteúdo** — guia, lore, final, comentário — fica
como quem escreveu escreveu, e quem precisar usa a tradução do navegador.

Não é preguiça, é a decisão de produto: hoje 100% do acervo é em português, então filtrar
conteúdo por idioma mostraria um site **vazio** para quem lê inglês. Guia mal traduzido por
máquina ainda ajuda; guia escondido não ajuda ninguém.

| Peça | Onde |
|---|---|
| `I18nService` | `core/i18n/` — idioma atual em signal, `t(chave, params)`, persistência |
| `TPipe` | `{{ 'nav.jogos' | t }}` nos templates |
| Dicionários | `core/i18n/pt-br.ts` e `core/i18n/en.ts` |
| Seletor | navbar, alternando entre os dois |

### O que quebra calado

- **O `<html lang>` continua dizendo `pt-BR`, mesmo com a interface em inglês.** Parece
  errado e é o contrário: esse atributo declara o idioma do **conteúdo**, e é dele que o
  Chrome parte para oferecer "traduzir esta página". Marcar a página como `en` tiraria a
  oferta de tradução justamente de quem precisa. O que acompanha a escolha é
  `data-ui-lang`.
- **Chave sem tradução cai no português**, não na chave crua. Uma tela com `home.titulo`
  escrito nela parece defeito; uma frase em português no meio do inglês é compreensível.
- **O `TPipe` é impuro de propósito.** Puro, ele só recalcularia quando o argumento muda —
  e a chave nunca muda, então trocar de idioma não redesenharia nada.
- **Spec que afirma texto de interface precisa fixar o idioma** (`i18n.trocar('pt-BR')`).
  Sem isso o teste segue o `navigator.language` do ambiente — o jsdom responde `en-US` —,
  e passa a quebrar na máquina de outra pessoa e não na sua.

### Não é o i18n do Angular, e por quê

O `@angular/localize` traduz em **tempo de build**: um bundle por idioma, e o servidor
escolhe qual serve. Isso multiplicaria a imagem e o SSR por idioma. Aqui a troca é em tempo
de execução, sem recarregar a página e sem segundo build.

### Estado

A base está pronta e o dicionário cobre navegação, ações comuns, estados, painel da run,
catálogo de itens, denúncia e moderação. As telas **já traduzidas** são a navbar, o
`report-button` e o painel da run — as demais continuam com texto fixo em português, e
migram uma por uma trocando a frase pela chave.

---

## Documentação

Este arquivo diz **o que fazer**. A pasta `docs/` diz **por quê**, **como é o desenho** e
**o que fazer quando quebra**.

| Pasta | O que é | Quando ler |
|---|---|---|
| [`docs/adr/`](docs/adr/) | Decisões de arquitetura deste repositório, imutáveis depois de aceitas | Antes de propor desfazer alguma coisa |
| [`docs/arquitetura/`](docs/arquitetura/) | C4 nível 3: camadas, services e o que renderiza no servidor. Os níveis 1 e 2 moram no back-end, com o `docker-compose.yml` | Ao chegar no projeto |
| [`docs/runbooks/`](docs/runbooks/) | Diagnóstico por sintoma: navegação que não acontece, preview de link vazio, SSR que não renderiza | Quando algo está quebrado |

**Isto é travado por teste.** O `src/documentacao.spec.ts` roda junto com a suíte e falha se
um ADR não está no índice, se falta uma das quatro seções, se um link relativo de `docs/`
não resolve, se um ADR cita uma trava que não existe — e, a que tem dentes, **se um service
novo de `core/services/` não aparece no diagrama de componentes**. É o equivalente do
`DocumentacaoTest` do back-end, cuja última regra é o serviço do compose no diagrama de
containers.

---

## Estado atual (agosto 2026)

O front está em operação e ligado ao back-end real. Nada da lista de features iniciais
continua em aberto: home, games, game-detail, quests (lista, kanban, grafo, editor,
condições, histórico, mapa), lore (lista, criação, editor, histórico), finais, perfil,
usuário, comunidade, busca e todo o fluxo de auth (login, Google, recuperação de senha)
existem — 24 features, 22 services em `core/services`, 13 componentes compartilhados,
2 guards e 3 interceptors.

**Onde a régua não está sendo cumprida:** a regra é um `.spec.ts` por componente e por
service, mas são 33 arquivos de spec para 94 arquivos de código — 387 testes, 58% de
cobertura de linhas. Feature nova continua nascendo com spec; o passivo é o que já existe
sem.

Para o estado do back-end, ver `Back-end/soulsguide/CLAUDE.md`.
