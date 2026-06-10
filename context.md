# SoulGuide — CONTEXT.md

Cole este arquivo no início de cada conversa com a IA para retomar o contexto.

---

## Visão geral

Site colaborativo e gratuito de guias para souls-likes (Elden Ring, Dark Souls III, Bloodborne, Lies of P, Lords of the Fallen, etc).
Sem fins financeiros — custos saem do bolso do autor. Botão de doação via Pix no rodapé.
Serve também como projeto de portfólio e laboratório de DevOps.

---

## Stack

| Camada          | Tecnologia                                             |
|-----------------|--------------------------------------------------------|
| Frontend        | Angular 22 + SCSS                                      |
| Backend         | Java 21 + Spring Boot 3.x                              |
| Banco           | PostgreSQL (Supabase no início)                        |
| BPMN            | bpmn-js                                                |
| Auth            | Spring Security + JWT                                  |
| Infra inicial   | Railway (backend) + Supabase (db) + Vercel (frontend)  |
| Infra futura    | AWS (EC2/ECS + RDS) para aprender DevOps               |
| CI/CD           | GitHub Actions                                         |
| Observabilidade | Grafana Cloud + Sentry + UptimeRobot (todos free tier) |
| Custo mensal    | ~R$ 33/mês                                             |

---

## Funcionalidades principais

### Quests

- Guias de quest criados e colaborados pela comunidade
- Visualização em **Kanban** — controle de progresso pessoal ("onde eu estou")
- Visualização em **BPMN** — jornada completa com quests interconectadas ("como o mundo funciona")
- Cada nó do grafo contém: passos, falas de NPCs e contexto de lore
- Quests podem se interconectar (ex: quest da Ranni ↔ quest do Blaidd convergem no Festival de Radahn)

### Lore

- Seção independente de artigos de lore, separada das quests mas linkada a elas
- Sistema de status por upvote da comunidade:
  - `TEORIA` — recém criado, interpretação pessoal
  - `CONSOLIDADO` — comunidade aprovou, bem embasado
  - `CANONICO` — mais votado do tema, vira artigo principal
- Itens não são entidades isoladas — existem apenas como evidências citadas dentro dos artigos de lore

### Colaboração

- Qualquer usuário pode criar guias ou clonar os da comunidade
- Sistema de versionamento para mesclar melhorias de clones ao original
- Login social (Google/Discord) via Spring Security

### UX

- Modo "simples" (Kanban) como padrão, BPMN como modo avançado
- Sistema de spoiler por etapa — usuário controla até onde quer ver
- Checkpoints pessoais — salva onde o usuário parou na quest

---

## Modelo de dados (visão geral)

- `User` — perfil, guias criados, progresso pessoal
- `Game` — Elden Ring, Dark Souls III, etc
- `QuestGuide` — guia de uma quest, pertence a um Game, criado por um User
- `QuestNode` — nó do grafo (etapa da quest), contém passos, falas, lore
- `QuestEdge` — aresta entre nós, define fluxo e condições
- `LoreArticle` — artigo de lore, status: TEORIA | CONSOLIDADO | CANONICO
- `UserProgress` — checkpoint pessoal do usuário em cada guia

---

## Estrutura de pastas (Frontend Angular)

```
src/
  app/
    core/           # guards, interceptors, services singleton
    shared/         # componentes, pipes, directives reutilizáveis
    features/
      home/
      games/
      quests/
        kanban/
        bpmn/
        editor/
      lore/
      profile/
    layout/         # navbar, sidebar, footer
  styles/           # variáveis SCSS globais, temas
  assets/
```

---

## Estado atual

- [ ] Projeto Angular 22 criado com SCSS
- [ ] Estrutura de pastas criada
- [ ] CONTEXT.md adicionado ao repositório
- [ ] Backend Spring Boot iniciado
- [ ] Modelagem do banco definida
- [ ] Deploy inicial configurado

---

## Decisões técnicas tomadas

- Sem SSR — app colaborativa autenticada, não precisa de SEO agressivo
- Itens não têm seção própria — vivem como citações dentro do lore
- Infra começa simples (Railway/Supabase/Vercel), migra pra AWS conforme o DevOps avança
- Observabilidade apenas com ferramentas gratuitas no lançamento
- Doação via Pix estático — sem integração de pagamento

---

## Próximos passos

1. Criar estrutura de pastas do Angular
2. Configurar SCSS global (variáveis, reset, tipografia)
3. Criar layout base (navbar + router-outlet)
4. Iniciar backend Spring Boot com estrutura de pacotes
