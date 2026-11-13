# Dockerfile for Platform Storefront App (apps/store)
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS builder
WORKDIR /app/apps/store

COPY apps/store/package.json apps/store/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline --no-audit

WORKDIR /app
COPY package.json ./
COPY seeds/assets ./seeds/assets
COPY apps/store ./apps/store

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV API_URL=http://127.0.0.1:8080
ENV WEB_URL=http://localhost:3000
ENV ADMIN_URL=http://localhost:3001
ENV IT_URL=http://localhost:3002
ENV STORE_URL=http://localhost:3003

RUN --mount=type=cache,target=/app/apps/store/.next/cache npm --prefix apps/store run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# outputFileTracingRoot is the repo root, so standalone nests the app one level down.
COPY --from=builder --chown=nextjs:nodejs /app/apps/store/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/store/.next/static ./apps/store/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/seeds/assets ./seeds/assets
COPY --from=builder --chown=nextjs:nodejs /app/seeds/assets ./apps/store/seeds/assets

USER nextjs

EXPOSE 3003

CMD ["node", "apps/store/server.js"]
