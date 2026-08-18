# Runbook — o preview do link vem vazio

## Sintoma

Um link do site colado no Discord, no WhatsApp, no X ou no Reddit aparece como
**"Soulguide"** e mais nada — sem título da quest, sem descrição, sem imagem. No Google, a
página aparece (ou não aparece) com o mesmo título de todas as outras.

Abrir o link no navegador funciona normalmente, o que é justamente o que confunde.

## Em 30 segundos

```bash
curl -s https://soulsguide.com.br/games/17/quests/45 | grep -E "<title>|og:title"
```

O que **tem** que aparecer é o título da quest:

```
<title>Belle · Lies of P · SoulGuide</title>
```

Se aparecer `<title>Soulguide</title>`, o HTML veio sem renderização — o crawler de preview
**não executa JavaScript**, então o que ele lê é exatamente o que este `curl` leu.

## Diagnóstico

### 1. O SSR está fora do ar e o nginx caiu no shell da SPA

```bash
docker compose ps soulguide-ssr
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4300/healthz
```

Com o container de SSR fora, o nginx não tem para onde mandar o HTML. Ver
[o SSR não renderiza](ssr-nao-renderiza.md).

### 2. O SSR está no ar, mas não conseguiu buscar o dado

O título cai para o valor declarado na rota (`Quest · SoulGuide` em vez do nome da quest).
Isso é o `data.seo` do `app.routes.ts` valendo — ou seja, a página renderizou **sem** a
resposta da API:

```bash
docker compose exec soulguide-ssr env | grep SSR_API_BASE
docker compose exec soulguide-ssr wget -q -O - http://gateway-api:8765/souls-guide-api/quests/45 | head -c 200
```

Causa recorrente: o container do `souls-guide-api` foi recriado e o **gateway** ficou com o
destino antigo, respondendo 503 para tudo. `docker compose restart gateway-api` resolve.

### 3. A rota está em `RenderMode.Client`

```bash
grep -n "RenderMode.Client" -A 2 -B 2 src/app/app.routes.server.ts
```

Login, perfil, editores e busca não renderizam no servidor **de propósito**. Se uma página
de conteúdo entrou nessa lista por engano, ela nunca vai ter preview.

### 4. O preview está cacheado no aplicativo que mostrou

Discord, WhatsApp e X guardam o preview por dias. Depois de corrigir, o link antigo continua
mostrando o resultado velho — teste com um parâmetro qualquer (`?x=1`) para forçar uma
busca nova antes de concluir que não funcionou.

## O que não é

- **Não é a `og:image`.** Sem título e sem descrição, o problema é o HTML inteiro não ter
  renderizado. A imagem é o último item a investigar, não o primeiro.
- **Não é o `robots.txt`.** Ele governa rastreamento de buscador, não o preview de um
  aplicativo de mensagem — que busca a URL direto, sem consultar nada.
- **Não é o `sitemap.xml`.** Ele acelera a descoberta pelo Google e não tem relação nenhuma
  com o que aparece no card do link.
- **Não adianta olhar o DevTools do navegador.** Lá o JavaScript roda e o título aparece
  certo. O único jeito de ver o que o crawler vê é o `curl`.
