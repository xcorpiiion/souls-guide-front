# ADR 0011 — A lore se lê pelo que cita: tipo na citação, e "sobre quem" no lugar de mundo/personagem

- **Status:** Aceita
- **Data:** 15/09/2026
- **Trava:** src/app/shared/utils/citacao-da-lore.spec.ts

## Problema

A página de leitura tratava toda citação do mesmo jeito: um bloco em mono com a linha de
origem embaixo. Com o elenco e os tipos do arquivo (ADR 0033 do souls-guide-api), uma lore passa
a citar nota, documento, diálogo, cutscene e criatura — e na leitura tudo virava a mesma caixa.
Um diálogo saía como "JAMES: Mary? LAURA: Não." corrido, e nada dizia quem aparecia em quê. O
sintoma, dito por quem criou o site: "só tem parte de mundo; e os diálogos? personagens? fica
muito misturado".

E a lore tinha que ser marcada à mão como "do mundo" ou "de personagem" (com o nome digitado).
É uma pergunta que a própria lore já responde pelas citações, e a resposta à mão sai errada ou
incompleta: uma lore sobre a ponte cita três pessoas.

## Decisão

**A citação continua sendo markdown**, e a linha de origem ganha quem está nela:

```
> JAMES: Mary?
LAURA: Ela não está aqui.
— Na ponte · diálogo, Cap. 3 · com James, Laura
```

`por X` para nota e documento (autor), `com X, Y` para o resto (presentes). O `·` do título
vira `-`, porque é o separador.

`shared/utils/citacao-da-lore.ts` lê de volta: tipo, título, capítulo, falas (só em diálogo e
cutscene) e pessoas — as declaradas mais quem fala. Em nota, "Dia 14: a menina voltou" é texto.

- **Leitura:** cada citação diz o tipo (ícone · tipo · capítulo), o diálogo sai fala a fala, e
  os nomes da origem são botões. "Quem aparece" lista todo mundo citado, com quantas vezes;
  tocar num nome apaga as outras citações e os parágrafos. Coluna ao lado na tela larga,
  fileira acima do texto no celular.
- **Publicadas:** o filtro "do mundo / de personagem" virou **"sobre quem"**, com os nomes
  citados nas lores carregadas; cada cartão diz o tipo da primeira citação e "cita A, B".
- **Montar lore:** o seletor mundo/personagem saiu. Mostra "cita A, B" enquanto se escreve.
  O servidor ainda exige `type`: vai `WORLD`, e editar mantém o que a lore antiga já tinha.

## Consequências

- Lore publicada antes disto continua lida: sem `com`/`por`, os nomes saem só das falas.
- Editar uma lore antiga reconhece os achados já citados pelos dois formatos de origem
  (`origemDe` e `origemSemPessoas`).
- O filtro "sobre quem" é do cliente, sobre o que já carregou: o servidor não sabe quem uma
  citação cita. "Mostrar mais" pode trazer mais nomes.
- Nome com vírgula no elenco se parte em dois na leitura. Aceito: nome de personagem com
  vírgula é raro, e o texto citado não se perde.
- `LoreArticle.type` e `characterName` ficam no servidor sem uso novo. Tirá-los é contrato, e
  fica para quando houver outro motivo para mexer lá.

## Alternativas descartadas

| Alternativa                                                                  | Por que não                                                                                                 |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Guardar as citações como estrutura no servidor (id do achado, tipo, pessoas) | Contrato novo e migração para um texto que já é cópia (ADR 0007); a origem em markdown carrega o suficiente |
| Separar a leitura em abas por tipo (diálogos, notas, personagens)            | Parte o texto corrido que é a lore; a ordem de leitura é o argumento                                        |
| Manter mundo/personagem ao lado do "sobre quem"                              | Duas respostas para a mesma pergunta, e a manual diverge                                                    |

## Referências

- `src/app/shared/utils/citacao-da-lore.ts`, `src/app/features/meu-arquivo/montar-lore/blocos.ts`
- `src/app/features/lore/lore-detail/`, `src/app/features/lore-mesa/lore-publicadas/`
- [ADR 0009](0009-a-lore-se-edita-como-se-monta.md), [ADR 0010](0010-o-arquivo-mora-na-lore.md)
- ADR 0033 do souls-guide-api — o elenco e os tipos do arquivo
