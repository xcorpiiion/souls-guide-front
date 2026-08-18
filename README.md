# SoulGuide — front

Site colaborativo de guias para souls-likes (Elden Ring, Dark Souls III, Bloodborne,
Lies of P, Lords of the Fallen). Angular 22, zoneless, standalone, signals.

Este repositório é **só o front**. A API é o `souls-guide-api`, e o stack inteiro sobe
pelo `docker-compose.yml` que vive em [`Back-end/soulsguide`](../../Back-end/soulsguide).

## Rodar

```bash
npm ci
npm start
```

O `ng serve` sobe em `http://localhost:4200` e fala com o gateway em `localhost:8765` —
então o stack precisa estar no ar. A imagem Docker é outra coisa: ela serve na **4300** e
chama as APIs por caminho relativo, com o nginx fazendo o proxy
(ver [ADR 0001](docs/adr/0001-apis-por-caminho-relativo.md)).

```bash
npm test            # 426 specs, Vitest
npm run lint
npm run build -- --configuration=container
```

## Duas imagens, um Dockerfile

```bash
./build.ps1
```

Gera `soulguide-front` (nginx: estático e proxy das APIs) e `soulguide-ssr` (Node:
renderiza o HTML). O `--target` é obrigatório nos dois — sem ele o `docker build` constrói
o último estágio do arquivo e publica o Node no lugar do nginx.

Renderizar no servidor não é enfeite: o crawler de preview do Discord, do WhatsApp e do X
não executa JavaScript. Sem SSR, todo link do site aparece no chat como "Soulguide" e mais
nada.

## Documentação

| Pasta | O que é |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | O que fazer: stack, estrutura, regras, o que não fazer |
| [`docs/adr/`](docs/adr/) | Por que cada decisão é assim, e o que foi descartado |
| [`docs/arquitetura/`](docs/arquitetura/) | C4 nível 3: camadas, services e o que renderiza no servidor |
| [`docs/runbooks/`](docs/runbooks/) | O que fazer quando quebra, por sintoma |

O `src/documentacao.spec.ts` roda junto com a suíte e falha se a documentação sair de
sincronia com o código — inclusive se um service novo não aparecer no diagrama de
componentes.
