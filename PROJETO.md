# SoulGuide — Resumo do Projeto

Guia colaborativo de souls-likes (Elden Ring, Dark Souls, Bloodborne, etc.).
Usuários podem seguir quests, ler lore e visualizar grafos de progressão.

---

## Stack do Front-end

| Tecnologia | Versão | Para quê |
|---|---|---|
| Angular | 21 | Framework principal |
| TypeScript | 5.x | Linguagem |
| SCSS | — | Estilização |
| Vitest | — | Testes unitários |
| Angular ESLint | — | Linting |
| Prettier | — | Formatação |
| Tabler Icons | latest | Ícones via webfont CDN |

### Padrões Angular usados
- **Zoneless** (`provideZonelessChangeDetection()`) — sem Zone.js, mais performático
- **Signals** (`signal`, `computed`, `effect`) — reatividade nativa do Angular
- **Standalone components** — sem NgModules
- **ChangeDetectionStrategy.OnPush** — em todos os componentes
- **`withComponentInputBinding()`** — params de rota via `input()`

---

## Estrutura de Pastas

```
src/
  app/
    core/
      services/
        monitoring.service.ts   ← Sentry (ErrorHandler + initSentry)
    features/
      home/                     ← Página inicial com hero, quests e lore em destaque
      games/                    ← Lista de jogos
      game-detail/              ← Detalhe do jogo com tabs e stats
      quests/                   ← Lista de quests com mini-grafo
      quest-detail/             ← Detalhe da quest com grafo BPMN interativo
        quest-graph/            ← Componente SVG do grafo (layout automático por camadas)
      quest-editor/             ← Editor de quests com canvas SVG
      lore/                     ← Lista de artigos de lore
      lore-detail/              ← Detalhe do artigo
      search/                   ← Busca global via query param (?q=)
      profile/                  ← Perfil do usuário
      not-found/                ← Página 404
    layout/
      navbar/                   ← Navbar com busca overlay e menu mobile
    shared/
      models/                   ← Interfaces TypeScript (Quest, Lore, Game, etc.)
      utils/
        mini-graph.ts           ← Utilitário de mini-grafo SVG inline (usado nas cards de quest)
  environments/
    environment.ts              ← Dev (production: false, sentryDsn)
    environment.prod.ts         ← Prod (production: true, sentryDsn)
  styles/
    _variables.scss             ← Design tokens (cores, espaçamentos, fontes)
    _mixins.scss                ← Mixins reutilizáveis + skeleton loaders
    _animations.scss            ← Keyframes (shimmer)
    _reset.scss                 ← Reset CSS
    _typography.scss            ← Estilos globais de texto
```

---

## Funcionalidades Implementadas

### UI / UX
- **Tema escuro** fixo (dark-only, sem toggle)
- **Skeleton loaders** com animação shimmer nas páginas de Quests e Lore
- **Responsivo mobile-first** — testado em telas de 360px+
- **Navbar** com busca overlay, menu hamburguer mobile, avatar de perfil
- **Grafo BPMN interativo** — SVG gerado dinamicamente com layout por camadas (BFS), scroll horizontal no mobile

### Páginas
- Home com hero, stats, quests em destaque e lore em destaque
- Lista de jogos com cards
- Detalhe do jogo com tabs (quests/lore/sobre) e stats
- Lista de quests com mini-grafo inline
- Detalhe da quest com grafo BPMN clicável e painel lateral de nó selecionado
- Editor de quests com canvas drag-and-drop (SVG)
- Lista e detalhe de artigos de lore
- Busca global por query param
- Perfil do usuário
- 404 personalizado

### Testes
193 testes passando com Vitest + Angular TestBed:
- `mini-graph.spec.ts`
- `lore.spec.ts`
- `quests.spec.ts`
- `search.spec.ts`
- `not-found.spec.ts`
- `app.spec.ts`
- `quest-graph.spec.ts`

---

## Monitoramento — Sentry

- **SDK**: `@sentry/angular`
- **Onde está**: `src/app/core/services/monitoring.service.ts`
- **Como funciona**:
  - `initSentry()` chamado em `app.config.ts` antes do bootstrap
  - `Sentry.createErrorHandler()` registrado como `ErrorHandler` do Angular
  - `Sentry.TraceService` registrado para rastrear navegação entre rotas
  - Guard `if (!environment.sentryDsn) return` — app funciona sem DSN configurado
- **DSN**: salvo em `src/environments/environment.ts` e `environment.prod.ts`
- **Painel**: https://sentry.io (login com Google, org "Vinicius Da Silva Cruz", projeto Angular)
- **Free tier**: 5.000 erros/mês

---

## Cloud — Firebase Hosting

### Projeto Firebase
- **Nome**: `soulsguide-f2b59`
- **Console**: https://console.firebase.google.com/project/soulsguide-f2b59

### Ambientes
| Ambiente | URL | Branch |
|---|---|---|
| Produção | https://soulsguide-f2b59.web.app | `main` |
| Dev | https://soulsguide-f2b59--dev-39oq180k.web.app | `develop` |

> O canal dev expira em 2026-06-18. Para recriar: `firebase hosting:channel:create dev`

### Configuração Firebase
- **`firebase.json`** — define `public: dist/soulguide/browser` e rewrite de todas as rotas para `/index.html` (necessário para SPA com roteamento Angular)
- **`.firebaserc`** — aponta para o projeto `soulsguide-f2b59`

---

## CI/CD — GitHub Actions

### Repositório
https://github.com/xcorpiiion/souls-guide-front

### Workflows

#### Deploy Produção (`.github/workflows/firebase-hosting-merge.yml`)
- **Trigger**: push na branch `main`
- **Passos**: checkout → setup Node 20 → `npm ci` → lint → testes → build → deploy Firebase (canal `live`)

#### Deploy Dev (`.github/workflows/deploy-dev.yml`)
- **Trigger**: push na branch `develop`
- **Passos**: mesmos acima → deploy Firebase (canal `dev`)

### Secrets configurados no GitHub
| Secret | Para quê |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_SOULSGUIDE_F2B59` | Autenticação do deploy no Firebase |

### Fluxo de trabalho
```
feature branch → develop → (CI: lint + test + build) → deploy dev
develop → main  → (CI: lint + test + build) → deploy prod
```

---

## Serviços Usados (todos free tier)

| Serviço | Para quê | Limite free |
|---|---|---|
| Firebase Hosting | Hospedagem do Angular | 10 GB/mês de transfer |
| GitHub Actions | CI/CD automatizado | 2.000 min/mês |
| Sentry | Monitoramento de erros em produção | 5.000 erros/mês |
| jsDelivr CDN | Tabler Icons webfont | ilimitado |

---

## Próximos Passos Sugeridos (Back-end)

O front-end está 100% com dados mockados. Para tornar o app real, o back-end precisaria expor:

- `GET /games` — lista de jogos
- `GET /games/:id` — detalhe do jogo
- `GET /games/:gameId/quests` — quests de um jogo
- `GET /games/:gameId/quests/:id` — detalhe da quest com nós e arestas do grafo
- `GET /lore` — lista de artigos
- `GET /lore/:id` — detalhe do artigo
- `GET /search?q=` — busca global
- `POST /quests` — criar quest (autenticado)
- `POST /quests/:id/follow` — seguir quest

### Autenticação sugerida
Firebase Auth (Google login) no front — envia JWT no header `Authorization: Bearer <token>` para o back-end validar.
