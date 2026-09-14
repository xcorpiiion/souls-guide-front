# ADR 0008 — A lore nova nasce do arquivo, e o editor em branco sai

- **Status:** Aceita
- **Data:** 14/09/2026
- **Trava:** src/app/features/lore-nova/lore-nova.spec.ts

## Problema

O redesenho do "meu arquivo" ("A mesa", `Meu arquivo - redesenho.dc.html`) trouxe um jeito
novo de escrever lore: escolher os achados, ordenar o fio e escrever entre as citações. Mas
ele entrou **só dentro da aba** do jogo, e `/lore/new` continuou abrindo o editor antigo —
título, jogo, tags e uma área de markdown em branco.

O sintoma foi o esperado: a pessoa entrou em `/lore/new` pelo "novo artigo" da lista de lore,
viu a tela de sempre e concluiu que o redesenho não tinha ido ao ar. Tinha, num lugar a que
nenhum dos três links de "novo artigo" levava.

## Decisão

**`/lore/new` passa a ser o "montar lore" do arquivo.** A tela pergunta o jogo (ou o recebe
em `?jogo=`, como o "+ contribuir" já mandava), carrega o arquivo daquele jogo e abre o mesmo
`MontarLore` da aba — o componente é um só, não uma cópia.

| Estado | O que a tela faz |
|---|---|
| Sem jogo | busca de jogo; a escolha vai para a URL, e recarregar não volta à busca |
| Arquivo vazio | não abre página em branco: manda registrar achado em `/games/{ref}?aba=arquivo` |
| Jogo fora do escopo | diz que o jogo não tem guias aqui, sem perguntar pelo arquivo (ADR 0027 do souls-guide-api) |
| Jogo inexistente na URL | volta para a busca, como se a query não viesse |

O `LoreCreate` foi removido. `/lore/:id/edit` continua sendo o editor de texto livre: editar
uma lore publicada é revisar o texto, e não montar de novo.

`?aba=` entrou na página do jogo para o estado de arquivo vazio. Sem ele, quem ia registrar o
primeiro achado caía na primeira aba do jogo e precisava achar o arquivo sozinho.

## Consequências

- Não se escreve mais lore sem ter registrado ao menos um achado do jogo. Em souls-like, onde
  a história está em descrição de item e não em nota, isso é mais trabalho — o achado aceita
  qualquer texto colado, então o caminho existe, mas é mais longo que o editor em branco.
- Capa, imagem no meio do texto e tags não existem na criação. Continuam no editor, depois de
  publicada.
- Um lugar só para mudar o fluxo de criar lore: o `MontarLore`.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Deixar os dois: `/lore/new` livre e o montar só na aba | Foi o estado que produziu o problema — o fluxo novo existia e ninguém chegava nele |
| Fluxo novo com um link "escrever sem o arquivo" | Mantém vivos dois caminhos de criação, e o em branco é o que o redesenho veio substituir. Descartado na conversa em que a decisão foi tomada |
| Rota nova (`/lore/montar`) e `/lore/new` redirecionando | Um endereço a mais para a mesma tela, e os links antigos já apontam para `/lore/new` |

## Referências

- `src/app/features/lore-nova/` e `src/app/features/meu-arquivo/montar-lore/`
- [ADR 0007](0007-a-citacao-da-lore-e-copia-do-achado.md) — a citação é cópia do achado
- ADR 0032 do souls-guide-api — o arquivo de achados é pessoal
