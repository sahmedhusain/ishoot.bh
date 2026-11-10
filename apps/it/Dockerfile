# syntax=docker/dockerfile:1.7
# Dockerfile for Platform IT Support App (apps/it)
# Usage: docker build -f apps/it/Dockerfile -t platform/it:dev .

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS builder
WORKDIR /app

COPY package.json ./
COPY apps/admin/package.json apps/admin/package-lock.json* ./apps/admin/
COPY apps/it/package.json apps/it/package-lock.json* ./apps/it/
COPY apps/web/package.json apps/web/package-lock.json* ./apps/web/
COPY backend/contracts/package.json backend/contracts/package-lock.json* ./backend/contracts/

WORKDIR /app/apps/it
RUN npm ci || npm install

WORKDIR /app
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm --prefix apps/it run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app ./

EXPOSE 3002

CMD ["npm", "--prefix", "apps/it", "run", "start"]
