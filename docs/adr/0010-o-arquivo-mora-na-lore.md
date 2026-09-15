# ADR 0010 — O arquivo de achados mora na lore, e não na página do jogo

- **Status:** Aceita
- **Data:** 14/09/2026
- **Trava:** src/app/features/lore-mesa/lore-mesa.spec.ts

## Problema

O brief do "meu arquivo" pedia uma aba na página de cada jogo, e foi assim que ela entrou.
Mas o arquivo é o começo da lore — é de onde a lore é montada (ADR 0008 e 0009) —, e quem
queria escrever lore ia para **Lore** no menu.

Ali encontrava a lista antiga de artigos, e mais nada. A mesa, a faixa de colar, o mural e o
"montar lore" existiam, escondidos numa aba de uma página que ninguém associava a escrever. O
sintoma, dito por quem criou o site: "falta coisa que está no design", "está confuso", "não
consigo criar mais notas".

## Decisão

**`/lore` é a mesa.** Duas abas:

| Aba | O que é |
|---|---|
| **meu arquivo** | escolhe o jogo e abre a `MeuArquivo`, a mesma do design, inteira |
| **publicadas** | a lista de artigos de antes, a `Lore`, sem o próprio cabeçalho |

- O jogo vai em **`?jogo=`**, e não no caminho. `/lore/:id` já é o endereço do artigo, e
  `/lore/silent-hill-f` seria ambíguo com o slug de uma lore.
- **Logado, abre em "meu arquivo"; deslogado, em "publicadas".** O arquivo é privado, e quem
  chega sem conta — inclusive o crawler, que é quem o SSR atende — vem pela lista.
- `?aba=` guarda a aba escolhida, e trocar de jogo não troca de aba.
- A página do jogo **perde a aba** e ganha o atalho "meu arquivo", que leva a
  `/lore?jogo={ref}`. O "ver todos" da lore do jogo leva à aba "publicadas".
- A busca de jogo virou `EscolherJogo`, compartilhada com `/lore/new`, e abre já com jogos para
  tocar em vez de um campo vazio.

## Consequências

- Um lugar só para tudo que é lore: anotar, ligar, montar, publicar e ler.
- O `?aba=arquivo` da página do jogo, que existia só para o estado vazio da nova lore, saiu
  junto com a aba.
- A mesa não mostra mais o cabeçalho do jogo (capa, contadores, seguir). Quem quer isso tem o
  jogo a um clique, e o nome dele fica no topo da mesa.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| `/lore` continua a lista, com um botão para `/lore/arquivo/:jogo` | Mantém a lista antiga como porta de entrada, e a mesa como um lugar a mais para achar |
| A mesa nos dois lugares, na lore e na aba do jogo | Duas portas para a mesma tela, e a dúvida de qual é a certa volta |
| `/lore/:jogo` no caminho | Colide com `/lore/:id` do artigo, que aceita slug |

## Referências

- `src/app/features/lore-mesa/`, `src/app/shared/components/escolher-jogo/`
- [ADR 0008](0008-a-lore-nova-nasce-do-arquivo.md), [ADR 0009](0009-a-lore-se-edita-como-se-monta.md)
- ADR 0032 do souls-guide-api — o arquivo de achados é pessoal
