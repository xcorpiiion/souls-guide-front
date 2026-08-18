# ADR 0003 — O HTTP passa pela plataforma, e o `environment` é lido num lugar só

- **Status:** Aceita
- **Data:** 18/08/2026
- **Trava:** `src/test-providers.ts` — sem o `provideApis` do ambiente de teste, 44 specs falham na subida

## Problema

Cada service montava a própria URL com `HttpClient` e uma constante de base. Quatro APIs,
vinte services, e a base repetida em cada um — a mesma informação mantida à mão em vinte
lugares, que é o padrão que o projeto inteiro combate.

O incômodo concreto não era escrever a linha, era o que ela arrasta junto: cabeçalho de
autenticação, tratamento de erro remoto e a decisão de qual API responde por qual recurso
ficavam espalhados, e cada service novo copiava o anterior — inclusive quando o anterior
estava errado.

## Decisão

As chamadas passam pelo `HttpService` do `@xcorpiiion/ng-core`, e cada service declara
apenas **de que recurso e de que API** ele fala:

```ts
private readonly api = inject(HttpService).resource('files', 'storage');
```

As quatro bases são nomeadas uma vez, na subida, em `app.config.ts`:

```ts
provideApis({ bases: environment.apis, defaultBase: 'soulsGuide' });
```

E a regra que sustenta isso: **a lib não importa o `environment`**. Quem lê o arquivo é o
app, e passa o resultado por provider. Uma lib que importasse `../environments/environment`
deixaria de compilar em qualquer projeto que nomeie as coisas de outro jeito — e a
plataforma existe para servir mais de um projeto.

Base desconhecida ou `defaultBase` fora da lista estouram **na subida**, não na primeira
chamada.

## Consequências

Trocar o endereço de uma API é uma linha. O `HttpClient` cru continua disponível e é usado
onde a chamada não é para uma base conhecida — o PUT dos bytes na URL assinada do bucket,
no `StorageService`, é o caso.

O custo apareceu nos testes: todo service que usa `HttpService` precisa do `provideApis`,
inclusive em teste de componente, que injeta service de forma indireta e não monta o
`app.config.ts`. Sem isso, 44 specs falhavam com `NG0201: No provider found for
InjectionToken pf.api.config`. A saída foi o `providersFile` do `angular.json`
(`src/test-providers.ts`), que aplica o provider ao ambiente de teste inteiro — em vez de
repetir a linha em 32 arquivos de spec.

Renderização de servidor precisou de um degrau a mais, porque caminho relativo não resolve
no Node: um interceptor torna a URL absoluta quando `SSR_API_BASE` está presente. Ver
[ADR 0001](0001-apis-por-caminho-relativo.md) e o
[ADR 0009 do back-end](../../../../Back-end/soulsguide/docs/adr/0009-o-html-do-conteudo-sai-do-servidor.md).

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| `HttpClient` direto em cada service | É o estado anterior: base repetida em vinte arquivos, e cada service novo copiando o anterior |
| A lib importar o `environment` do app | Amarra a lib ao nome do arquivo e à forma do objeto. Ela deixa de compilar em qualquer projeto que nomeie diferente |
| Um `ApiService` próprio do SoulGuide | Seria a mesma peça, num repositório onde ela serve um consumidor só. A regra da plataforma é o contrário: peça com 2+ consumidores sobe, peça com zero desce |
| Repetir `provideApis` em cada spec | 32 arquivos, e o 33º nasce quebrado. O `providersFile` resolve no lugar onde o ambiente de teste é definido |

## Referências

- `src/app/app.config.ts`, `src/test-providers.ts`
- `src/app/core/services/storage.service.ts` — o caso em que o `HttpClient` cru fica
