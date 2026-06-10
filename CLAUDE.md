# SoulGuide — CLAUDE.md

Arquivo de instruções para o Claude Code. Leia antes de qualquer ação.
Para contexto completo do produto, leia também o `CONTEXT.md`.

---

## O projeto

SoulGuide é um site colaborativo de guias para souls-likes (Elden Ring, Dark Souls III, Bloodborne, Lies of P, Lords of the Fallen).
Projeto pessoal/portfólio, sem fins financeiros. Doação via Pix no rodapé.

---

## Stack

- **Frontend:** Angular 21, SCSS, Signals, Standalone Components, OnPush
- **Backend:** Java 21, Spring Boot 3.x, PostgreSQL
- **BPMN:** bpmn-js
- **Auth:** Spring Security + JWT + Login social (Google/Discord)
- **Infra:** Railway + Supabase + Vercel (~R$33/mês)
- **CI/CD:** GitHub Actions
- **Observabilidade:** Grafana Cloud + Sentry + UptimeRobot (free tier)

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

## Regras de código — Angular

- Sempre **standalone components** (padrão Angular 22)
- Sempre **OnPush** change detection
- **Signals** para estado local — evitar Subject/BehaviorSubject para estado local
- **Lazy loading** em todas as rotas de features
- Nunca usar `any` no TypeScript
- Interfaces para todos os modelos em `shared/models/`
- SCSS próprio por componente, nunca style inline
- Importar variáveis SCSS via `@use 'styles/variables' as v`

---

## Regras de código — Java

- Pacotes organizados por **feature**, não por camada
- **Records** do Java 21 para DTOs
- Nunca expor entidades JPA diretamente — sempre DTOs
- Validação com `@Valid` + Bean Validation
- Respostas sempre com `ResponseEntity`
- Nomenclatura: controllers em `/api/v1/`

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
- Não criar seção/entidade de itens separada
- Não usar localStorage para estado sensível
- Não expor entidades JPA direto nas APIs
- Não commitar chaves de API ou senhas
- Não criar componente sem SCSS próprio
- Não usar Zone.js — projeto usa Zoneless (Angular 22 padrão)

---

## Estado atual do projeto

- [x] Projeto Angular 22 criado com SCSS
- [x] Estrutura de pastas definida
- [x] CONTEXT.md e CLAUDE.md criados
- [x] _variables.scss criado com tokens de design
- [ ] Estrutura de pastas criada no projeto (rodar create-structure.bat)
- [ ] angular.json configurado para SCSS global
- [ ] Layout base criado (navbar + router-outlet)
- [ ] Rotas lazy load configuradas
- [ ] Backend Spring Boot iniciado

---

## Próxima sessão — continuar aqui

1. Rodar `create-structure.bat` para criar as pastas
2. Configurar `angular.json` para importar `_variables.scss` globalmente
3. Criar `_reset.scss` e `_typography.scss`
4. Criar layout base com navbar e router-outlet
5. Configurar rotas lazy load para cada feature
