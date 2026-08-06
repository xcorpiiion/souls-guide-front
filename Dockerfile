# syntax=docker/dockerfile:1

# ── Stage 1: build ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# O .npmrc precisa entrar ANTES do npm ci: o projeto depende de
# @xcorpiiion/canonico, que vem do GitHub Packages e exige autenticação.
# Sem ele o install falha em "401 Unauthorized".
COPY package*.json .npmrc ./

# O token entra como secret do BuildKit, não como ARG: valores de ARG ficam
# gravados no histórico da imagem e vazariam a credencial para quem a baixar.
RUN --mount=type=secret,id=github_token \
    GITHUB_TOKEN="$(cat /run/secrets/github_token)" npm ci --legacy-peer-deps

COPY . .
RUN npm run build -- --configuration=development

# ── Stage 2: serve ──────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist/soulguide/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
