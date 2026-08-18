# Arquitetura — soulguide (front)

O desenho em C4, em Mermaid, para renderizar direto no GitHub.

## Os níveis moram onde a informação nasce

| Nível | Onde | Por quê |
|---|---|---|
| 1 — Contexto | [`soulsguide/docs/arquitetura/c4-1-contexto.md`](../../../../Back-end/soulsguide/docs/arquitetura/c4-1-contexto.md) | O sistema é um só; quem usa e com que sistemas externos ele fala não muda por repositório |
| 2 — Containers | [`soulsguide/docs/arquitetura/c4-2-containers.md`](../../../../Back-end/soulsguide/docs/arquitetura/c4-2-containers.md) | Os processos saem do `docker-compose.yml`, que vive no back-end. `soulguide-front` e `soulguide-ssr` estão lá |
| 3 — Componentes | [`c4-3-componentes-front.md`](c4-3-componentes-front.md) (aqui) | O que existe **dentro** do front: rotas, services, e o que renderiza no servidor |

Copiar os níveis 1 e 2 para cá criaria a segunda fonte de verdade que o projeto combate —
e ela sairia de sincronia no primeiro container novo. O que fica aqui é o que só este
repositório sabe.

## Quando atualizar

- **service novo em `core/services/`** — o `documentacao.spec.ts` falha até ele aparecer
  no diagrama de componentes;
- rota nova que renderize no servidor, ou que passe a ser `RenderMode.Client`;
- pasta nova em `src/app/` (nível de camada, não de conteúdo dentro dela).
