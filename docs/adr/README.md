# ADRs — soulguide (front)

Registro das decisões de arquitetura **deste repositório**. Um arquivo por decisão,
numerado, imutável depois de aceito: decisão que muda não é editada, é **substituída** por
uma nova que a referencia.

O que um ADR guarda é o que o código não consegue dizer: o problema que existia antes, o
que foi descartado e **por quê**. Ler o código responde "o que faz"; ler o ADR responde
"por que não do outro jeito" — que é a pergunta que volta seis meses depois, geralmente
como proposta de desfazer.

## Onde cada decisão mora

| Repositório | O que registra |
|---|---|
| `soulguide/docs/adr/` (aqui) | Decisões do front: build da imagem, camada de HTTP, estilo, recuperação de bundle velho |
| [`platform/docs/adr/`](../../../../platform/docs/adr/) | Decisões da plataforma, que valem para os seis serviços: segurança, contratos, build, observabilidade |
| [`soulsguide/docs/adr/`](../../../../Back-end/soulsguide/docs/adr/) | Decisões do back-end. O SSR e o sitemap moram lá, no [ADR 0009](../../../../Back-end/soulsguide/docs/adr/0009-o-html-do-conteudo-sai-do-servidor.md), porque a decisão é uma só e atravessa os dois repositórios |

A divisão não é burocracia. A regra que o projeto inteiro persegue é **não manter a mesma
informação em dois lugares** — copiar para cá a decisão do SSR criaria a segunda fonte de
verdade que o projeto combate. Quando um ADR daqui depender de um de lá, ele **linka**.

## Índice

| # | Decisão | Status |
|---|---|---|
| [0001](0001-apis-por-caminho-relativo.md) | As APIs entram por caminho relativo, e quem faz proxy é o nginx | Aceita |
| [0002](0002-aba-com-bundle-velho-se-recarrega.md) | A aba que atravessou um deploy se recarrega sozinha | Aceita |
| [0003](0003-http-pela-plataforma-environment-num-lugar-so.md) | O HTTP passa pela plataforma, e o `environment` é lido num lugar só | Aceita |
| [0004](0004-tokens-sem-reset-e-tipografia-da-lib.md) | Os tokens da lib entram sem o reset e a tipografia dela | Aceita |
| [0005](0005-o-que-jsdom-nao-ve-tem-teste-de-navegador.md) | O que o jsdom não vê tem teste de navegador, contra o stack no ar | Aceita |
| [0006](0006-signal-forms-entra-por-uma-tela.md) | Signal Forms entra por uma tela, e não pelas sete | Aceita |

## Como escrever um novo

Parta do [`TEMPLATE.md`](TEMPLATE.md), pegue o próximo número e acrescente a linha no
índice acima — o `documentacao.spec.ts` falha se as duas coisas não acontecerem juntas.

Não escreva ADR para o que o código já diz sozinho. Escreva quando houver uma alternativa
razoável que foi descartada, ou um defeito real que a decisão veio matar.
