# ADR 0007 — A citação de uma lore é cópia do achado, e não referência a ele

- **Status:** Aceita
- **Data:** 14/09/2026
- **Trava:** src/app/features/meu-arquivo/montar-lore/montar-lore.spec.ts

## Problema

O "meu arquivo" guarda o texto das notas, documentos, diálogos e cutscenes que a pessoa
encontrou, e é **privado**: toda consulta do servidor filtra pelo dono, até para admin (ADR
0032 do souls-guide-api).

O redesenho da aba ("A mesa") trouxe o passo seguinte: **montar uma lore** com esse arquivo —
escolher achados, ordenar pelo fio que já existe entre eles e escrever entre as citações. A
lore publicada é pública. Então o texto de um achado privado precisa aparecer dentro de um
artigo público, e alguma coisa tem que decidir como.

## Decisão

**A citação é uma cópia do trecho**, escrita dentro do `content` do artigo como bloco de
citação do markdown que o site já usa:

```
> texto do achado, com as quebras de linha
— Título do achado · tipo, capítulo
```

| Decisão | Por quê |
|---|---|
| **Cópia, não id** | O artigo não depende do arquivo para existir. Apagar um achado, ou editar o texto dele, não muda uma lore que outras pessoas já leram — do mesmo jeito que citar um livro não muda quando o livro ganha edição nova |
| **O bloco `> ` que já existe** | A página do artigo já desenha citação. Nenhum formato novo no servidor, nenhum contrato novo no canonico, nenhuma migração |
| **Só o texto, o título e o capítulo** | A anotação do dono não sai, e os achados não citados continuam privados. A tela de publicar lista isso item por item antes do botão |
| **Linha em branco dentro do achado vira quebra simples** | No markdown do site, linha em branco separa blocos, e ela partiria a citação em duas |
| **O rascunho é uma lore pessoal privada** | É o que o perfil já oferece (`isPublic: false`). Um estado "rascunho" novo no servidor seria um segundo jeito de guardar a mesma coisa |

## Consequências

**O artigo não sabe de onde veio a citação.** Não há link de volta do trecho para o achado, e
não há como listar "as lores que citam este achado". Para o que existe hoje — publicar uma
teoria —, isso não faz falta; se um dia fizer, a origem está na última linha de cada citação
e dá para reconstruir.

**Editar a lore depois é editar markdown.** O editor de lore continua sendo o de sempre, e lá a
citação aparece como texto com `> `. A montagem com blocos existe só na primeira escrita.

**A página do artigo passou a respeitar quebra de linha dentro da citação** (`white-space:
pre-line` no `.ld__quote-text`). Sem isso, as falas de um diálogo viravam um parágrafo corrido.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Guardar o id do achado na lore e resolver na hora de ler | O artigo público teria de ler dado privado para se desenhar, e o ADR 0032 do back-end existe justamente para que nada leia o arquivo de alguém que não seja o dono. Apagar o achado quebraria a lore |
| Uma tabela de citações no servidor, com o trecho copiado | Resolve a mesma coisa que a cópia no texto, com migração, contrato e endpoint a mais — para um vínculo que nenhuma tela usa |
| Formato próprio de citação (`[[achado:12]]`) | Precisaria de parser novo na página do artigo e no editor, e o texto ficaria ilegível para quem edita pelo editor de lore |

## Referências

- ADR 0032 do souls-guide-api — o arquivo é pessoal
- `src/app/features/meu-arquivo/montar-lore/montar-lore.ts`
- `src/app/shared/utils/lore-content.ts` — o bloco `> ` que a página do artigo já lê
