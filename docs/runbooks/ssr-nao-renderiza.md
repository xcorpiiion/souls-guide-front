# Runbook — o SSR não renderiza

## Sintoma

Uma destas três, todas com o site aparentemente no ar:

- página em branco, com o CSS carregado;
- `500` no documento HTML, enquanto os assets respondem `200`;
- `400` com o corpo `Header "host" with value "..." is not allowed.`

## Em 30 segundos

```bash
docker compose logs --tail=50 soulguide-ssr
```

Erro de renderização sai **só aqui**. Quem acessa recebe uma página vazia sem pista
nenhuma, porque a exceção aconteceu no servidor.

## Diagnóstico

### 1. `ReferenceError: localStorage is not defined` (ou `window`, ou `document`)

A causa mais provável, e a que derruba **todas as rotas de uma vez**.

O bundle de servidor importa código que assume navegador. Hoje é o `localStorage` que o
`@xcorpiiion/ng-core` lê sem guarda de plataforma — e quem chama `isLoggedIn()` é a navbar,
que está em toda página. `src/ssr-globals.ts` é o contorno; ele precisa ser importado
**antes de tudo** em `src/main.server.ts`:

```ts
import './ssr-globals';
```

Um organizador de imports que mova essa linha para baixo quebra a renderização inteira, e é
por isso que ela mora num arquivo próprio em vez de ser uma linha solta.

Se o erro citar outra API de navegador, a lib (ou o código do app) ganhou uma dependência
nova de browser. A correção definitiva é guardar o acesso com `isPlatformBrowser` na
origem; o contorno é acrescentar o que falta ao `ssr-globals.ts`.

### 2. `Header "host" ... is not allowed`

O `allowedHosts` do `@angular/ssr` recusou o `Host` da requisição.

```bash
docker compose exec soulguide-ssr env | grep SSR_ALLOWED_HOSTS
```

O padrão é `*`, e é deliberado: nada no servidor deriva do `Host` — a base da API vem de
`SSR_API_BASE` e o domínio canônico de `SITE_URL`. Se alguém restringiu a lista, o acesso
pelo IP da LAN e pela URL sorteada do quick tunnel para de funcionar, porque nenhum dos
dois é previsível.

### 3. A página renderiza, mas sem dado

Não é erro, é o `SSR_API_BASE` inalcançável — a página sai com os textos declarados na rota
e sem conteúdo:

```bash
docker compose exec soulguide-ssr wget -q -O - http://gateway-api:8765/souls-guide-api/quests/45 | head -c 200
```

`503` aqui costuma ser o gateway com destino antigo depois de o `souls-guide-api` ter sido
recriado: `docker compose restart gateway-api`.

### 4. A imagem errada foi publicada

O mesmo `Dockerfile` gera as duas imagens, por `--target`:

```bash
docker inspect xcorpiiion/soulguide-front:latest --format '{{.Config.Cmd}}'
```

Tem que ser o nginx. Se aparecer `node dist/soulguide/server/server.mjs`, alguém buildou
sem `--target web` — sem ele, o `docker build` constrói o **último** estágio do arquivo, que
é o de SSR, e o front vira uma segunda cópia do Node.

## O que não é

- **Não é o nginx.** Se os assets respondem 200 e o HTML não, o nginx está fazendo o dele:
  servindo o que existe em disco e mandando o resto para o SSR.
- **Não é o navegador de quem acessa.** Página em branco no servidor é igual em todos.
- **Não é hidratação.** Erro de hidratação aparece no console do navegador **com** a página
  renderizada; aqui não há página.
