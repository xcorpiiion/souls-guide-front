# SoulGuide — Claude Rules

Estas regras guiam o comportamento da IA em todas as sessões do projeto.

---

## Contexto do projeto

Sempre leia o CONTEXT.md antes de qualquer coisa.
O projeto é o SoulGuide — guias colaborativos para souls-likes.
Stack: Angular 22 + Java 21 Spring Boot + PostgreSQL.

---

## Regras gerais

- Uma coisa por sessão — foco em um componente, endpoint ou tela por vez
- Sempre gerar código production-ready, não exemplos didáticos
- Usar SCSS, nunca CSS inline ou style binding desnecessário
- Componentes Angular sempre standalone (padrão Angular 22)
- Usar Signals para estado local (padrão Angular 22, sem Zone.js)
- Nomenclatura em inglês no código, comentários em português se necessário
- Sempre atualizar o CONTEXT.md ao final da sessão com o que foi feito

---

## Frontend (Angular 22)

- Componentes standalone por padrão
- Signals para estado reativo (evitar Subject/BehaviorSubject para estado local)
- OnPush change detection em todos os componentes
- Lazy loading em todas as rotas de features
- SCSS com variáveis globais de `styles/variables.scss`
- Nunca usar `any` no TypeScript
- Interfaces para todos os modelos de dados

---

## Backend (Java 21 + Spring Boot 3)

- Arquitetura em pacotes por feature, não por camada
- Records do Java 21 para DTOs
- Repository pattern com Spring Data JPA
- Validação com Bean Validation (@Valid)
- Respostas padronizadas com ResponseEntity
- Nunca expor entidades JPA diretamente — sempre usar DTOs

---

## O que nunca fazer

- Não criar seção de itens separada — itens são citações dentro do lore
- Não adicionar SSR
- Não usar localStorage para estado sensível
- Não expor senha ou chave de API em nenhum arquivo commitado
- Não criar componentes sem SCSS próprio
