# SoulGuide — CLAUDE.md

Arquivo de instruções para o Claude Code. Leia antes de qualquer ação.
Leia também `.claude/rules.md` para regras de código detalhadas.

---

## O projeto

SoulGuide é um site colaborativo de guias para souls-likes (Elden Ring, Dark Souls III, Bloodborne, Lies of P, Lords of the Fallen).
Projeto pessoal/portfólio, sem fins financeiros.

---

## Stack

- **Frontend:** Angular 21 (não 22), Zoneless, SCSS, Signals, Standalone, OnPush
- **Testes:** Vitest
- **BPMN:** bpmn-js@18 (editor e viewer de quests como grafo)
- **Drag-drop:** @angular/cdk@21
- **CI/CD:** GitHub Actions + SonarCloud (repo público, free)
- **Backend:** ainda não existe — fase mock-first

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
    features/
      home/
      games/
      quests/
        kanban/       # visualização de progresso pessoal
        bpmn/         # visualização de jornada com quests interconectadas
        editor/       # criação e edição de guias
      lore/           # artigos de lore com sistema de status
      profile/        # perfil do usuário, meus guias, doações
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
- Componentes grandes → dividir. Limite: ~200 linhas de HTML, ~150 de SCSS, ~100 de TS
- Todo componente e service criado deve ter arquivo `.spec.ts`
- Mock-first: dados em `*.mocks.ts`, nunca inline no componente
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

## O que NÃO fazer

- Não adicionar SSR
- Não criar seção/entidade de itens separada (itens são citações no lore)
- Não usar localStorage para estado sensível
- Não commitar chaves de API ou senhas
- Não criar componente sem SCSS próprio
- Não criar componente sem spec correspondente
- Não usar Zone.js
- Não usar `any`

---

## Estado atual (junho 2025)

- [x] Angular 21, zoneless, signals, OnPush, lazy routes
- [x] Layout: navbar + router-outlet
- [x] Styles: _variables.scss, _mixins.scss, _reset.scss, _typography.scss
- [x] Shared: Button, Toast, SearchInput, EmptyState, TruncatePipe
- [x] Services: LoadingService, ToastService
- [x] Feature home: completa com mocks
- [x] Feature games: completa com mocks
- [x] CI/CD: GitHub Actions + SonarCloud
- [ ] Feature games: GameCard como subcomponente + specs
- [ ] Feature games/:id (detalhe do jogo)
- [ ] Feature quests: lista + editor BPMN + viewer
- [ ] Feature lore: lista + artigo
- [ ] Feature profile: espaço pessoal
