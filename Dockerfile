# syntax=docker/dockerfile:1
# Dokoon customer web app (PWA). Multi-stage: build with Node, serve with unprivileged nginx.
#   docker build -t dokoon-web .                                  # production bundle
#   docker build -t dokoon-web:mock --build-arg BUILD_MODE=mock . # self-contained demo with MSW mocks
# Only PUBLIC VITE_* values may be passed as build args (they end up in the browser bundle).

ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY . .

ARG BUILD_MODE=production
ARG VITE_API_BASE_URL=
ARG VITE_NESHAN_MAP_KEY=
ARG VITE_BALAD_MAP_KEY=
ARG VITE_DEFAULT_MAP=neshan
ARG VITE_PAYMENT_PROVIDER=fake
ARG VITE_WEBPUSH_VAPID_PUBLIC_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_NESHAN_MAP_KEY=$VITE_NESHAN_MAP_KEY \
    VITE_BALAD_MAP_KEY=$VITE_BALAD_MAP_KEY \
    VITE_DEFAULT_MAP=$VITE_DEFAULT_MAP \
    VITE_PAYMENT_PROVIDER=$VITE_PAYMENT_PROVIDER \
    VITE_WEBPUSH_VAPID_PUBLIC_KEY=$VITE_WEBPUSH_VAPID_PUBLIC_KEY

RUN npx vite build --mode "$BUILD_MODE" \
 && node scripts/secret-scan.mjs dist

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
