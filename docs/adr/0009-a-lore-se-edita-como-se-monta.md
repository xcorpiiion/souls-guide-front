# ADR 0009 — A lore se edita no mesmo formato em que se monta, e o editor antigo sai inteiro

- **Status:** Aceita
- **Data:** 14/09/2026
- **Trava:** src/app/features/meu-arquivo/montar-lore/blocos.spec.ts

Substitui o [ADR 0008](0008-a-lore-nova-nasce-do-arquivo.md) — mantém tudo o que ele decidiu
sobre `/lore/new`, e desfaz a parte que deixava `/lore/:id/edit` com o editor livre.

## Problema

O ADR 0008 tirou o editor em branco da criação e o manteve na edição. O resultado apareceu no
primeiro uso:

- a lore montada com citações abria para editar como markdown cru, com `> teste` e
  `— teste · nota, sem capítulo` numa área de texto, e nenhuma das peças que a montaram;
- o **rascunho** não tinha saída. "Guardar rascunho" gravava uma lore pessoal e privada, que
  não aparece em `/lore`; o "editar" dela levava ao formulário antigo, que salvava de volta como
  rascunho. Não havia botão que a publicasse.

A pessoa concluiu, com razão, que a lore criada tinha sumido.

## Decisão

**Não há mais editor à parte.** `/lore/:id/edit` e `/profile/lore/:id/edit` abrem o mesmo
`MontarLore`, já no passo da escrita, com o arquivo do jogo disponível para citar mais achados.
O `LoreEditor` foi removido, e com ele o último código do jeito antigo de escrever lore.

| Peça | O que faz |
|---|---|
| `blocos.ts` | lê o markdown salvo de volta em parágrafos e citações, e serializa de novo — ida e volta dão o mesmo texto |
| Citação **fixa** | a que já estava no artigo guarda o trecho copiado, e não relê o achado (ADR 0007). A linha de origem reconhece o achado, e ele não é oferecido para citar de novo |
| Lore publicada | um botão só, "salvar alterações"; tags e capa que o artigo já tinha vão junto, para editar não apagá-las |
| Rascunho | "publicar como teoria" cria a lore e **apaga o rascunho**; "guardar rascunho" atualiza o mesmo, sem criar outro. Na página do artigo, o botão diz "continuar rascunho" |

O arquivo é acessório na edição: se não carregar (jogo fora do escopo, servidor sem resposta),
a lore abre do mesmo jeito, sem achados para citar.

## Consequências

- Um formato só para escrever lore, do começo ao fim. Mudar a escrita é mudar o `MontarLore`.
- Artigo antigo escrito à mão (títulos, listas, imagem no texto) abre como um parágrafo só, com
  o markdown dentro. Nada se perde, mas a barra de formatação do editor antigo não existe mais.
- Trocar o jogo de uma lore já salva deixou de ser possível pela tela.
- Publicar um rascunho são duas chamadas, criar e apagar. Se a segunda falhar, a lore publicada
  existe e o rascunho fica no perfil — a pessoa vê a mensagem de erro e apaga à mão. O inverso,
  apagar antes, poderia perder o texto.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Manter o editor livre para edição | É o estado que produziu o problema: a lore montada abre como markdown cru |
| Converter a citação salva em referência ao achado ao reabrir | Relê um dado privado e muda o texto que outras pessoas já leram quando o achado é editado — o que o ADR 0007 recusou |
| Publicar o rascunho mudando `isPersonal` no servidor | Não existe essa operação na API, e a lore pessoal e a da comunidade são linhas com regras de acesso diferentes |

## Referências

- `src/app/features/meu-arquivo/montar-lore/` (`blocos.ts`, `montar-lore.ts`)
- `src/app/features/lore-edicao/`
- [ADR 0007](0007-a-citacao-da-lore-e-copia-do-achado.md), [ADR 0008](0008-a-lore-nova-nasce-do-arquivo.md)
