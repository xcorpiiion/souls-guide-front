# ADR 0001 — As APIs entram por caminho relativo, e quem faz proxy é o nginx

- **Status:** Aceita
- **Data:** 18/08/2026
- **Trava:** `environment.container.ts` e o bloco de proxy do `nginx.conf`

## Problema

O `environment` do front carregava o endereço do gateway como host fixo
(`http://localhost:8765/souls-guide-api`). Isso funciona em exatamente um caso: o
navegador aberto na mesma máquina que roda o stack.

Para qualquer outro — o celular na mesma rede, um amigo pela URL do túnel — `localhost` é
**o aparelho de quem acessa**, não o servidor. O site carregava (o HTML vem do container),
e todas as chamadas de API morriam em erro de conexão. O sintoma é o pior tipo: a página
abre, o layout aparece, e o conteúdo simplesmente não vem.

Trocar o host fixo pelo endereço público também não resolve: ele é decidido em **tempo de
build**, e a URL do quick tunnel muda a cada subida do container.

## Decisão

Na imagem, as APIs são **caminhos relativos** — `/souls-guide-api`, `/authorization-api`,
`/user-api`, `/storage-api` — e quem resolve o destino é o nginx da própria imagem, que faz
proxy para o gateway dentro da rede do compose.

É o que o `--configuration=container` faz: troca `environment.ts` por
`environment.container.ts`. O `ng serve` continua com `localhost:8765`, porque na máquina
do desenvolvedor não há nginx no meio.

Um mesmo bundle passa a servir `localhost`, o IP da LAN e a URL do túnel. E, por ser tudo
a mesma origem, **CORS deixa de existir no caminho**.

## Consequências

O túnel aponta para o front, não para o gateway: uma URL só cobre site e API. É também o
que faz `STORAGE_LOCAL_BASE_URL` ir vazio — a URL assinada sai sem host, e o navegador a
resolve contra a origem de onde baixou o site.

O que ficou mais caro: o nginx passou a ser parte da aplicação, e não um detalhe de
empacotamento. Três coisas dele já custaram diagnóstico e estão comentadas no arquivo — o
`resolver` do Docker (sem ele o nginx resolve o nome do gateway uma vez na subida e morre
quando o stack reinicia junto), o `^~` nos blocos de proxy (sem ele a regex de cache de
assets casava a URL assinada de upload e devolvia 405 no PUT), e o `Cache-Control` do
`index.html` (cacheado, o navegador pede chunks que o deploy novo apagou).

E renderização de servidor precisou de uma saída própria: caminho relativo não existe no
Node. Ver [ADR 0009 do back-end](../../../../Back-end/soulsguide/docs/adr/0009-o-html-do-conteudo-sai-do-servidor.md).

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Host fixo no bundle | Só funciona no navegador da própria máquina. Foi o estado anterior |
| Host injetado em tempo de execução (`window.__env`) | Resolve, mas acrescenta um arquivo de configuração servido antes do bundle e um ponto de falha novo, para um problema que o proxy resolve sem código |
| CORS aberto no gateway, com o front chamando o endereço público | Publica a API numa origem diferente da do site sem necessidade, e ainda depende de saber o endereço público em tempo de build |
| Túnel apontando para o gateway, e o front noutra URL | Duas URLs para o usuário e CORS de volta |

## Referências

- `src/environments/environment.container.ts` e `nginx.conf`
- [C4 · Containers](../../../../Back-end/soulsguide/docs/arquitetura/c4-2-containers.md)
