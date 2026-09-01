# C4 · Nível 3 — Componentes do front

O que existe dentro do `soulguide-front` e do `soulguide-ssr`. Para os processos e as
portas, ver [Containers](../../../../Back-end/soulsguide/docs/arquitetura/c4-2-containers.md).

---

## 3.1 — As camadas

```mermaid
flowchart TB
    subgraph rotas ["Rotas — src/app/app.routes.ts"]
        features["<b>features/</b><br/><small>24 telas, todas lazy</small>"]
        serverRoutes["<b>app.routes.server.ts</b><br/><small>quem renderiza no servidor</small>"]
    end

    subgraph app ["Aplicação"]
        layout["<b>layout/</b><br/><small>navbar, sidebar, footer</small>"]
        shared["<b>shared/</b><br/><small>componentes, pipes, utils, models</small>"]
        core["<b>core/services/</b><br/><small>toda chamada de API</small>"]
    end

    subgraph plataforma ["Libs da plataforma"]
        ngcore["<b>@xcorpiiion/ng-core</b><br/><small>HttpService, AuthService, guards</small>"]
        ui["<b>@xcorpiiion/ui</b><br/><small>botão, toast, modal</small>"]
        canonico["<b>@xcorpiiion/canonico</b><br/><small>tipos gerados dos DTOs Java</small>"]
    end

    gw["gateway-api<br/><small>via nginx, mesma origem</small>"]

    features --> core
    features --> shared
    features --> ui
    layout --> core
    core --> ngcore
    core -.->|só tipos| canonico
    shared -.->|só tipos| canonico
    ngcore --> gw
    serverRoutes -.->|decide por rota| features

    classDef caixa fill:#1168bd,stroke:#0b4884,color:#fff
    classDef lib fill:#2d6a9f,stroke:#0b4884,color:#fff
    classDef externo fill:#999,stroke:#6b6b6b,color:#fff,stroke-dasharray: 5 3
    class features,serverRoutes,layout,shared,core caixa
    class ngcore,ui,canonico lib
    class gw externo
```

### O que este desenho decide

**Nenhum componente chama API direto.** Toda chamada passa por um service de
`core/services/`, e todo service passa pelo `HttpService` da plataforma — ver
[ADR 0003](../adr/0003-http-pela-plataforma-environment-num-lugar-so.md).

**`canonico` entra só como tipo.** Ele é gerado dos DTOs Java do back-end, então o
contrato quebra em tempo de compilação aqui quando muda lá. Não há classe dele em tempo de
execução.

**`shared/` não conhece `features/`.** É a direção que permite mover uma tela sem arrastar
o resto junto.

---

## 3.2 — Os services

Um por área do domínio. Todos em `src/app/core/services/`.

```mermaid
flowchart LR
    subgraph conteudo ["Conteúdo público"]
        game["game.service"]
        gameSeries["game-series.service"]
        gameSection["game-section.service"]
        quest["quest.service"]
        lore["lore.service"]
        ending["ending.service"]
        item["item.service"]
        boss["boss.service"]
        questVersion["quest-version.service"]
        loreVersion["lore-version.service"]
        questCondition["quest-condition.service"]
        questMap["quest-map.service"]
        comment["comment.service"]
    end

    subgraph pessoal ["Do usuário"]
        personalQuest["personal-quest.service"]
        personalLore["personal-lore.service"]
        profile["profile.service"]
        progress["progress.service"]
        questProgress["quest-progress.service"]
        run["run.service"]
        user["user.service"]
        notification["notification.service"]
        push["push.service"]
        moderacao["moderacao.service"]
        discordLogin["discord-login.service"]
    end

    subgraph infra ["Do app, não do domínio"]
        seo["seo.service"]
        atualizacao["atualizacao-do-app"]
        storage["storage.service"]
        loading["loading.service"]
        monitoring["monitoring.service"]
    end

    classDef s fill:#1168bd,stroke:#0b4884,color:#fff
    class game,gameSeries,push,quest,lore,ending,item,boss,questVersion,loreVersion,questCondition,questMap,comment,personalQuest,personalLore,profile,progress,questProgress,run,user,notification,moderacao,discordLogin,seo,atualizacao,storage,loading,monitoring s
```

Cinco deles não falam **só** com o `souls-guide-api`:

| Service | Com quem fala |
|---|---|
| `user.service` | `user-api`, pelo gateway |
| `storage.service` | `storage-api` para o ticket e os metadados, e **direto com o bucket** para o PUT dos bytes, numa URL assinada |
| `monitoring.service` | Sentry, e só no navegador — ver 3.3 |
| `discord-login.service` | ninguém: monta a URL de autorização do Discord e guarda o `state` no `sessionStorage`. Quem troca o código por token é a `authorization-api`, porque a troca exige o client secret |
| `push.service` | o `souls-guide-api` para a chave VAPID e a inscrição, e **o service worker** para o resto. É ele, e não o servidor, que sabe se *este* aparelho está inscrito — perguntar ao servidor daria a resposta de outro aparelho |

---

## 3.3 — O que renderiza no servidor

```mermaid
flowchart TB
    req(["Requisição"])
    nginx["nginx<br/><small>existe em disco?</small>"]
    estatico["bundle, imagem,<br/>robots.txt, sitemap"]
    ssr["soulguide-ssr<br/><small>Node</small>"]
    modo{"app.routes.server.ts"}
    server["<b>RenderMode.Server</b><br/><small>jogo, quest, lore, final,<br/>perfil público, listagens</small>"]
    client["<b>RenderMode.Client</b><br/><small>login, perfil, editores, busca</small>"]

    req --> nginx
    nginx -->|sim| estatico
    nginx -->|não| ssr
    ssr --> modo
    modo --> server
    modo --> client

    classDef caixa fill:#1168bd,stroke:#0b4884,color:#fff
    classDef decisao fill:#2d6a9f,stroke:#0b4884,color:#fff
    class nginx,ssr,estatico,server,client caixa
    class modo decisao
```

A regra é o público: página que um buscador ou um preview de link precisa ler sai pronta
do servidor. Página que só existe depois do login não sai — o servidor não tem sessão, e
renderizar a versão deslogada para jogá-la fora na hidratação é custo sem resultado.

Duas consequências que não avisam quando quebram:

- **o bundle de servidor importa código que assume navegador.** Hoje é o `localStorage`
  que o `@xcorpiiion/ng-core` lê sem guarda de plataforma; `src/ssr-globals.ts` é o
  contorno, e sem ele a renderização morre em todas as rotas de uma vez, porque quem chama
  `isLoggedIn()` é a navbar;
- **nada no SSR pode sair do cabeçalho `Host`** — a base da API vem de `SSR_API_BASE`, o
  domínio canônico de `SITE_URL`.

Ver o [ADR 0009 do back-end](../../../../Back-end/soulsguide/docs/adr/0009-o-html-do-conteudo-sai-do-servidor.md).
