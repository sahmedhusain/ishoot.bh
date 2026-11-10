# syntax=docker/dockerfile:1.7
# Multi-app Dockerfile for Next.js frontends (web, admin, it)
# Usage: docker build --build-arg APP=web -t platform/web:dev .

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
RUN apk add --no-libc-compat --no-cache libc6-compat
WORKDIR /app

FROM base AS builder
ARG APP=web
WORKDIR /app

COPY package.json ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/it/package.json ./apps/it/
COPY apps/web/package.json ./apps/web/
COPY backend/contracts/package.json ./backend/contracts/

RUN npm --prefix apps/${APP} install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm --prefix apps/${APP} run build

FROM base AS runner
ARG APP=web
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app ./

EXPOSE 3000 3001 3002

CMD ["sh", "-c", "npm --prefix apps/${APP} run start"]
