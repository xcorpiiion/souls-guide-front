# Runbook — a tela antiga volta no domínio, mesmo apagada do código

## Sintoma

Em `soulsguide.com.br`, uma tela que **já não existe no código** continua aparecendo depois
do deploy — o caso real foi o editor antigo de lore ("tipo de lore: lore do mundo / de
personagem"), ao editar uma lore pessoal. No localhost a mesma rota abre a tela nova.

Ctrl+Shift+R às vezes resolve e o problema volta no deploy seguinte. Por isso parece cache do
navegador, e não é.

## Em 30 segundos

Com o site aberto no domínio, no console:

```js
await (await fetch('/ngsw/state')).text()
```

Procure `Driver state`:

```
Driver state: EXISTING_CLIENTS_ONLY (Degraded due to: Hash mismatch (cacheBustedFetchFromNetwork):
https://soulsguide.com.br/robots.txt: expected 5434…, got 2986… (after cache busting)
```

Achou. O service worker tentou instalar a versão nova, um arquivo chegou diferente do build,
e ele **desistiu da versão e ficou servindo a que já tinha**. `NORMAL` ali quer dizer que a
causa é outra — ver [a navegação não acontece depois de um deploy](navegacao-nao-acontece-depois-de-deploy.md).

## Diagnóstico

### 1. Qual arquivo chega diferente

Todo arquivo de um `assetGroup` do `ngsw-config.json` tem o hash conferido. Confira pelo
domínio, e não pelo localhost — quem altera é a borda:

```bash
curl -s "https://soulsguide.com.br/ngsw.json?ngsw-cache-bust=1" -o ngsw.json
# para cada caminho de hashTable: sha1 do que o domínio entrega == valor da tabela?
```

Na primeira vez, dos 175 arquivos, só o `robots.txt` divergia.

### 2. Por que diverge

```bash
diff <(curl -s http://localhost:4300/robots.txt) <(curl -s https://soulsguide.com.br/robots.txt)
```

O Cloudflare acrescenta ao começo do `robots.txt` o texto do **robots.txt gerenciado**
("content signals"). O arquivo que o build gerou nunca chega igual, então **nenhuma** versão
nova instala no domínio.

Outras funções da borda que reescrevem resposta causam o mesmo: Rocket Loader, minificação
automática, ofuscação de e-mail, desafio de bot numa rajada de requisições.

## Correção

Tirar do `ngsw-config.json` o arquivo que a borda altera. O `robots.txt` existe para robô de
busca, e não precisa estar offline. O `service-worker-config.spec.ts` impede que ele volte.

Depois do deploy, quem estava preso **sai sozinho**: o service worker degradado continua
conferindo o `ngsw.json`, e a primeira versão que instala inteira o devolve a `NORMAL`. Uma
aba nova (ou recarregar) já abre a versão nova.

## O que não é

- **Não é o código.** O servidor não tem a tela: `grep` no container do front não acha nada.
- **Não é o `Cache-Control` do `ngsw.json`.** Ele chega `no-cache` pelo domínio; o
  `max-age=14400` que o Cloudflare põe no `ngsw-worker.js` não impede a troca de versão, que
  é decidida pelo `ngsw.json`.
- **Não adianta pedir para limpar o cache.** Resolve até o próximo deploy, e só para quem
  limpou.
