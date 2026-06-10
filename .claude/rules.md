# SoulGuide — Claude Rules

Estas regras guiam o comportamento da IA em todas as sessões do projeto.
Leia este arquivo e o CLAUDE.md antes de qualquer ação.

---

## Stack

- Angular 21 (não 22 — muito recente, instável)
- Zoneless: `provideZonelessChangeDetection()`
- Standalone components (sem `standalone: true` explícito — padrão no Angular 21)
- OnPush em todos os componentes
- Signals: `signal()`, `computed()`, `input()`, `output()`
- SCSS: `@use 'styles/variables' as v` e `@use 'styles/mixins' as m`
- Vitest para testes unitários
- Mock-first: construir UI com dados mockados antes de qualquer backend

---

## Tamanho de arquivos e divisão de componentes

- Componente com mais de ~200 linhas de template HTML → dividir em subcomponentes
- Componente com mais de ~150 linhas de SCSS → avaliar extração de partes em componentes menores
- Componente com mais de ~100 linhas de TypeScript → avaliar se está fazendo coisas demais
- Card, item de lista, seção reutilizável → sempre extrair como componente próprio
- Nunca colocar lógica de negócio no template — mover para o `.ts`
- Nunca usar `any` no TypeScript

---

## Testes unitários

- Todo componente criado deve ter um arquivo `.spec.ts` correspondente
- Todo service criado deve ter um arquivo `.spec.ts` correspondente
- Usar Vitest como runner (já configurado no projeto)
- Componentes: usar `TestBed` com `@angular/core/testing`
- Services: testar com `TestBed` ou instância direta (sem mock desnecessário)
- Signals são testados diretamente — chamar o signal e verificar o valor
- Mocks: criar apenas o necessário, sem over-engineering
- Cobertura mínima esperada: lógica de filtragem, computed signals, métodos públicos

Exemplo de estrutura de spec para componente:
```typescript
describe('GameCard', () => {
  it('deve exibir o nome do jogo', () => { ... });
  it('deve emitir forkRequested ao clicar em fazer fork', () => { ... });
  it('deve mostrar mensagem de vazio quando não há quest top', () => { ... });
});
```

---

## Padrões de projeto Angular

- **Componentes de feature** (`features/`) → orquestram dados e subcomponentes, pouca lógica de UI
- **Componentes shared** (`shared/components/`) → recebem dados via `input()`, emitem via `output()`, sem dependência de services
- **Services** → lógica de negócio, estado global, chamadas HTTP futuras
- **Models** (`shared/models/`) → interfaces e types, sem lógica
- **Mocks** → arquivo `*.mocks.ts` por feature, nunca inline no componente

Fluxo de dados:
```
Feature component → recebe dados do mock/service
  → passa via input() para componentes filhos
  → recebe eventos via output()
  → atualiza estado com signals
```

---

## Nomenclatura

- Arquivos: `kebab-case` (`game-card.ts`, `game-card.html`, `game-card.scss`)
- Classes: `PascalCase` (`GameCard`, `GamesService`)
- Seletores: `app-` prefix (`app-game-card`)
- Signals: nome sem prefixo (`selectedGame`, não `selectedGame$` nem `selectedGameSignal`)
- Outputs: nome do evento no imperativo (`forkRequested`, `gameSelected`)
- Mocks: constante em `UPPER_SNAKE_CASE` (`GAMES_SUMMARY`)

---

## SCSS

- Sempre `@use 'sass:list'` antes de usar funções de lista
- Nunca usar funções globais do Sass (deprecated) — usar `list.nth()`, `map.get()`, etc.
- BEM para nomes de classe: `.game-card__banner--er`
- Nunca `!important`
- Nunca style inline no template

---

## O que nunca fazer

- Não criar componente sem SCSS próprio
- Não criar componente sem spec correspondente
- Não usar Zone.js
- Não usar `any`
- Não usar `Subject`/`BehaviorSubject` para estado local (usar `signal`)
- Não commitar chaves de API ou senhas
- Não adicionar SSR
- Não criar seção de itens separada — itens são citações dentro do lore
- Não usar `localStorage` para estado sensível
- Não criar arquivo de componente com mais de 200 linhas sem justificativa
