# ADR 0002 — A aba que atravessou um deploy se recarrega sozinha

- **Status:** Aceita
- **Data:** 18/08/2026
- **Trava:** `stale-bundle.spec.ts`

## Problema

O Angular carrega cada rota por `import()` dinâmico, e o nome de cada chunk carrega um
hash do conteúdo. Quando um deploy sobe, os chunks antigos deixam de existir no servidor —
mas quem já está com a página aberta continua com o `main.js` velho na memória, apontando
para eles.

Na primeira navegação, o `import()` falha em 404 e **a tela simplesmente não troca**. Sem
erro visível, sem mensagem: a pessoa clica no menu e nada acontece. Não dá para consertar
no servidor, porque o `main.js` que está rodando já foi baixado.

## Decisão

O `withNavigationErrorHandler` do router reconhece o erro de chunk e recarrega a página. O
`index.html` não é cacheado justamente para que a recarga traga o bundle novo.

A trava contra laço fica no `sessionStorage`: **uma tentativa por aba**. Se a recarga cair
de novo num bundle quebrado, o par erro-recarrega viraria laço infinito, e aí o problema é
outro e precisa aparecer.

## Consequências

A navegação depois de um deploy custa uma recarga, no lugar de não acontecer. Em troca,
uma classe inteira de "o site travou" desaparece.

O service worker (ver [ADR 0009 do back-end](../../../../Back-end/soulsguide/docs/adr/0009-o-html-do-conteudo-sai-do-servidor.md))
mudou esse problema de lugar, mas **não o substitui**: ele serve a versão antiga inteira e
consistente, então nada quebra — e a pessoa pode ficar dias numa versão velha sem sinal
nenhum. É por isso que existe o `AtualizacaoDoApp`, que avisa e recarrega na navegação
seguinte. As duas peças cobrem falhas diferentes: uma o bundle que sumiu, a outra a versão
que ficou para trás.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Não fazer nada | É o estado anterior: a tela não troca e nada explica |
| Manter os chunks antigos no servidor | Adia o problema e cresce para sempre. E não cobre o caso de a aba ficar aberta por semanas |
| Recarregar sem trava | O par erro-recarrega vira laço infinito quando o bundle novo também falha |
| Avisar e deixar a pessoa recarregar | A informação não é acionável para quem não é desenvolvedor. O clique dela já foi um pedido de navegação |

## Referências

- `src/app/core/stale-bundle.ts` e `src/app/app.config.ts`
- `src/app/core/services/atualizacao-do-app.ts`
