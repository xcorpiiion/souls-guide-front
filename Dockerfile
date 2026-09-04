# syntax=docker/dockerfile:1

# ── Stage 1: build ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# O .npmrc precisa entrar ANTES do npm ci: o projeto depende de
# @xcorpiiion/canonico, que vem do GitHub Packages e exige autenticação.
# Sem ele o install falha em "401 Unauthorized".
COPY package*.json .npmrc ./

# O token entra como secret do BuildKit, não como ARG: valores de ARG ficam
# gravados no histórico da imagem e vazariam a credencial para quem a baixar.
RUN --mount=type=secret,id=packages_token \
    PACKAGES_TOKEN="$(cat /run/secrets/packages_token)" npm ci --legacy-peer-deps

COPY . .
# `container` é o `development` mais as APIs por caminho relativo — o nginx desta mesma
# imagem faz o proxy para o gateway. Ver src/environments/environment.container.ts.
RUN npm run build -- --configuration=container

# ── Stage 2: serve ──────────────────────────────────────────────────────────────
# O nome do estágio não é enfeite: com o estágio de SSR abaixo, `docker build` sem
# `--target` passaria a construir o último, e a imagem do front viraria o Node.
FROM nginx:1.31-alpine AS web

COPY --from=builder /app/dist/soulguide/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-proxy-comum.inc /etc/nginx/conf.d/proxy-comum.inc

EXPOSE 80

# ── Stage 3: SSR ────────────────────────────────────────────────────────────────
# Alvo separado, da MESMA build: `docker build --target ssr`. O nginx acima continua
# servindo estático e fazendo o proxy das APIs; o que ele passa para cá é o HTML.
#
# Dois containers, e não um com nginx e node juntos, porque o nginx desta imagem carrega
# conhecimento que custou caro (o resolver do Docker, o `^~` que salvou o PUT da URL
# assinada, o Cache-Control do index.html). Reescrever isso em Express para caber num
# processo só seria trocar uma coisa que funciona por uma reescrita.
FROM node:24-alpine AS ssr

WORKDIR /app

# Só o que o servidor precisa: o bundle de servidor e o de navegador, que ele lê para
# montar o HTML. Nada de node_modules — o build do Angular já embute as dependências
# do servidor no bundle.
COPY --from=builder /app/dist/soulguide ./dist/soulguide

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Sem porta publicada no compose: quem alcança este processo é o nginx do front, dentro
# da rede. O healthcheck é o /healthz do server.ts, que responde sem renderizar página.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD wget -q -O /dev/null http://localhost:4000/healthz || exit 1

CMD ["node", "dist/soulguide/server/server.mjs"]
