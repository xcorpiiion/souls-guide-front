# ADR 0012 — O perfil tem a própria mesa, sobre o próprio arquivo

- **Status:** Aceita
- **Data:** 15/09/2026
- **Trava:** src/app/features/arquivo-do-perfil/arquivo-do-perfil.spec.ts

## Problema

A lore só do perfil (`/profile/lore/new`) montava a partir do arquivo da mesa de `/lore`, e não
tinha mesa: pelo perfil não havia onde registrar nota, cadastrar elenco nem ligar achados. Quem
usa testou registrar uma nota "na parte da lore privada" e não achou por onde; e a nota
registrada em `/lore` aparecia na lore do perfil.

## Decisão

**Dois arquivos, duas mesas.** O servidor separou os arquivos (ADR 0035 do souls-guide-api), e
o front dá a cada um a sua mesa:

| Mesa | Endereço | Arquivo | Monta |
|---|---|---|---|
| da lore | `/lore?jogo=` | `COMMUNITY` | `/lore/new`, a lore publicada |
| do perfil | `/profile/lore/arquivo?jogo=` | `PROFILE` | `/profile/lore/new`, a lore do perfil |

- É o mesmo `MeuArquivo`, com `espaco`: registrar, elenco, ligações, mural e montar lore.
- O rascunho do registro também é por arquivo — o texto colado no perfil não abre na mesa da
  lore.
- A lore do perfil se monta e se edita com o arquivo do perfil; a publicada, com o da lore.
- O perfil ganha "meu arquivo" ao lado de "montar lore só minha".

## Consequências

- O que é do perfil não aparece na lore, e o contrário. Quem quer a mesma nota nos dois
  registra duas vezes.
- A mesa do perfil não tem a aba "publicadas": o perfil é o lugar do que é só da pessoa.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Um arquivo só, com a mesa também no perfil | Oferecida; a escolha foi separar |
| Uma aba "perfil" dentro da mesa de `/lore` | Deixaria a lore privada morando no endereço da lore pública, que foi a queixa de origem |

## Referências

- `src/app/features/arquivo-do-perfil/`, `src/app/features/meu-arquivo/meu-arquivo.ts`
- [ADR 0010](0010-o-arquivo-mora-na-lore.md), [ADR 0011](0011-a-lore-se-le-pelo-que-cita.md)
- ADR 0035 do souls-guide-api — dois arquivos por pessoa
