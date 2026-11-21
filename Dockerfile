# syntax=docker/dockerfile:1
# Dokoon web apps (PWA). Multi-stage: build with Node, serve with unprivileged nginx.
# One Dockerfile, three images (decisions D-91, D-125): APP=customer (default), APP=panel (restaurant
# panel) or APP=courier (courier app).
#   docker build -t dokoon-web .                                              # customer, production
#   docker build -t dokoon-web:mock --build-arg BUILD_MODE=mock .             # customer demo with MSW mocks
#   docker build -t dokoon-panel --build-arg APP=panel .                      # restaurant panel
#   docker build -t dokoon-courier --build-arg APP=courier .                  # courier app
# Only PUBLIC VITE_* values may be passed as build args (they end up in the browser bundle).

ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY . .

ARG APP=customer
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

# Build the chosen app into out/ with its nginx config next to it, then scan the bundle for secrets.
RUN case "$APP" in \
      customer) cfg=vite.config.ts; conf=docker/nginx.conf ;; \
      panel) cfg=vite.panel.config.ts; conf=docker/nginx.panel.conf ;; \
      courier) cfg=vite.courier.config.ts; conf=docker/nginx.courier.conf ;; \
      *) echo "APP must be customer, panel or courier, got '$APP'" >&2; exit 1 ;; \
    esac \
 && npx vite build --config "$cfg" --mode "$BUILD_MODE" --outDir out \
 && node scripts/secret-scan.mjs out \
 && cp "$conf" nginx.out.conf

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY --from=build /app/nginx.out.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
