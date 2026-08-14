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
FROM nginx:1.30-alpine

COPY --from=builder /app/dist/soulguide/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-proxy-comum.inc /etc/nginx/conf.d/proxy-comum.inc

EXPOSE 80
