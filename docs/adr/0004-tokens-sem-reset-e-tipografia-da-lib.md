# ADR 0004 — Os tokens da lib entram sem o reset e a tipografia dela

- **Status:** Aceita
- **Data:** 18/08/2026
- **Trava:** nenhuma automática — ver "Consequências"

## Problema

O `@xcorpiiion/ui` traz componentes prontos (botão, toast, modal de confirmação) e um
conjunto de estilos: tokens de cor, um reset e uma tipografia. Adotar o pacote inteiro
resolveria o visual dos componentes da lib de uma vez — e trocaria o visual do SoulGuide
inteiro junto, porque o reset e a tipografia dela valem para todas as tags da página.

O site tem identidade própria (fundo quase preto, dourado, serifa nos títulos). Trocar os
três de uma vez não é migração, é **restyle** — e um restyle disfarçado de tarefa de
infraestrutura é o tipo de mudança que ninguém consegue revisar.

## Decisão

Só as **custom properties** da lib entram:

```scss
@use '@xcorpiiion/ui-tokens/scss/tokens';
```

O reset e a tipografia continuam sendo os do SoulGuide. A paleta do site sobrescreve os
tokens em `:root`, e é isso que faz o `pf-button`, o `pf-toast` e o `pf-confirm-modal`
saírem dourados **sem uma linha de CSS na lib**.

## Consequências

A lib pode evoluir os componentes dela sem mexer no visual do site, e o site pode mudar de
paleta sem tocar na lib.

O custo é uma duplicação assumida e temporária: o SCSS do app ainda usa `$color-gold` e
companhia com valor literal, em `styles/_variables.scss`, então **quem muda a paleta muda
nos dois lugares**. Não dá para terminar isso de uma vez — são 217 chamadas de
`rgba($color, …)`, e `rgba()` é função SCSS que não aceita `var()`. A migração acontece
arquivo a arquivo, à medida que cada componente é tocado por outro motivo.

Não há teste travando isso, e é uma escolha: um teste que comparasse os dois lugares
falharia hoje, no estado conhecido e aceito. O que segura é o comentário no topo do
`styles.scss`, onde quem for mexer na paleta esbarra.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Adotar o pacote de estilos inteiro da lib | Troca o visual do site junto com a infraestrutura. Vira restyle sem revisão |
| Não usar a lib de UI | Reescreveria botão, toast e modal de confirmação aqui, para servir um projeto só |
| Migrar as 217 chamadas de `rgba()` de uma vez | Um commit gigante que toca todo o SCSS do projeto, com risco visual em cada tela e nenhuma forma barata de revisar |
| Trocar `rgba()` por `color-mix()` em massa | Resolve o impedimento técnico, mas é a mesma mudança gigante — e ainda por cima uma mudança de comportamento de cor, não só de sintaxe |

## Referências

- `src/styles.scss` e `src/styles/_variables.scss`
