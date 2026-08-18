# Runbooks — front

O que fazer quando alguma coisa está quebrada **no site**. Um arquivo por sintoma — pelo
sintoma, não pela causa, porque quem chega aqui só tem o sintoma.

Cada runbook segue a mesma forma:

1. **Sintoma** — o que se vê, exatamente
2. **Em 30 segundos** — o comando que separa metade das causas das outras
3. **Diagnóstico** — as causas em ordem de frequência, com o teste de cada uma
4. **O que não é** — as pistas falsas conhecidas, que já custaram tempo

Para sintoma de API — 401 em rota pública, fila parada, migração que não aplicou —, os
runbooks são os [do back-end](../../../../Back-end/soulsguide/docs/runbooks/).

## Índice

| Sintoma | Runbook |
|---|---|
| A tela não troca ao navegar, sem erro visível | [a navegação não acontece depois de um deploy](navegacao-nao-acontece-depois-de-deploy.md) |
| Link do site colado no Discord aparece sem título nem imagem | [o preview do link vem vazio](preview-do-link-vem-vazio.md) |
| Página em branco, 500 no HTML, ou "Bad Request" com menção a `host` | [o SSR não renderiza](ssr-nao-renderiza.md) |

## Antes de qualquer um deles

```bash
docker compose ps soulguide-front soulguide-ssr
```

Desde o SSR, o site tem **dois** containers: o nginx serve o que existe em disco e faz o
proxy das APIs, e o Node renderiza o HTML. Um site que carrega o CSS e não mostra conteúdo
nenhum é o segundo fora do ar, não o primeiro.

```bash
docker compose logs --tail=100 soulguide-ssr
```

Erro de renderização sai aqui — e **só aqui**. O navegador de quem acessa recebe uma
página em branco ou um 500, sem pista nenhuma, porque o erro aconteceu no servidor.
