# Runbook — a navegação não acontece depois de um deploy

## Sintoma

A pessoa clica num link do menu e **nada acontece**. A URL não muda, a tela não troca,
nenhuma mensagem aparece. Recarregar a página resolve, e por isso quase nunca é relatado —
quem usa assume que "travou".

Acontece com quem estava com a aba aberta enquanto uma versão nova subiu.

## Em 30 segundos

Console do navegador (F12), na hora do clique:

```
Failed to fetch dynamically imported module: https://.../chunk-A1B2C3.js
```

Achou. Cada rota é um `import()` dinâmico e cada chunk tem hash do conteúdo no nome; o
deploy novo apagou os chunks antigos, e a aba aberta continua com o `main.js` velho na
memória apontando para eles.

## Diagnóstico

### 1. O `index.html` está sendo cacheado

É a causa raiz mais comum, porque ela transforma um problema de uma navegação num problema
permanente:

```bash
curl -s -D - -o /dev/null http://localhost:4300/index.html | grep -i cache-control
```

Tem que responder `no-cache, must-revalidate`. O `index.html` é o único arquivo **sem hash
no nome**, e é ele que diz qual `main-XXXX.js` carregar — cacheado, o navegador continua
pedindo os chunks do build anterior para sempre. O bloco `location = /index.html` do
`nginx.conf` existe só para isso.

### 2. A recarga automática não rodou

O `withNavigationErrorHandler` deveria ter recarregado a página sozinho, uma vez por aba
(ver [ADR 0002](../adr/0002-aba-com-bundle-velho-se-recarrega.md)). Se não recarregou:

```js
sessionStorage.getItem('sg_recarregou_por_chunk');
```

`"1"` significa que a aba **já tentou** e caiu de novo — a trava contra laço infinito está
funcionando, e o problema é outro (o bundle novo também está quebrado, ou o servidor está
servindo uma mistura de versões).

### 3. O service worker está servindo uma versão velha

Desde o PWA, o service worker serve uma versão inteira e consistente — então a navegação
funciona, mas a pessoa pode ficar dias numa versão antiga:

```js
navigator.serviceWorker.getRegistrations().then(console.log);
```

O `AtualizacaoDoApp` avisa e recarrega na navegação seguinte. Se ele não avisou:

```bash
curl -s -D - -o /dev/null http://localhost:4300/ngsw-worker.js | grep -i cache-control
curl -s -D - -o /dev/null http://localhost:4300/ngsw.json | grep -i cache-control
```

Os dois têm que responder `no-cache`. O nome deles não tem hash, e a regex de assets do
nginx marca `.js` com um ano e `immutable` — cacheado assim, **o app para de atualizar
para sempre**, sem erro nenhum.

## O que não é

- **Não é o roteador do Angular.** A rota está declarada e funciona numa aba nova. O que
  falha é o download do chunk, não a resolução da rota.
- **Não é cache do navegador para os assets com hash.** Esses podem e devem ser cacheados
  por um ano — o nome muda a cada build, e é o nome que invalida.
- **Não adianta limpar o cache do navegador de quem relatou.** Resolve para essa pessoa e
  esconde a causa; se o `index.html` está cacheado, volta no próximo deploy para todo mundo.
