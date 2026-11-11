# syntax=docker/dockerfile:1.7
# Multi-app Dockerfile for Next.js frontends (web, admin, it)
# Usage: docker build --build-arg APP=web -t platform/web:dev .

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS builder
ARG APP=web
WORKDIR /app

COPY package.json ./
COPY apps/admin/package.json apps/admin/package-lock.json* ./apps/admin/
COPY apps/it/package.json apps/it/package-lock.json* ./apps/it/
COPY apps/web/package.json apps/web/package-lock.json* ./apps/web/
COPY backend/contracts/package.json backend/contracts/package-lock.json* ./backend/contracts/

WORKDIR /app/apps/${APP}
RUN npm ci || npm install

WORKDIR /app
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm --prefix apps/${APP} run build

FROM ${NODE_IMAGE} AS runner
ARG APP=web
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
# The standalone server reads PORT; each compose service overrides it.
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# outputFileTracingRoot is the repo root, so standalone nests the app one level down.
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP}/.next/static ./apps/${APP}/.next/static

USER nextjs

EXPOSE 3000 3001 3002

CMD ["sh", "-c", "exec node apps/${APP}/server.js"]
