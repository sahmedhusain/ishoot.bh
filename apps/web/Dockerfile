# syntax=docker/dockerfile:1.7
# Dockerfile for Platform Web App (apps/web)
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

WORKDIR /app/apps/web
RUN npm ci || npm install

WORKDIR /app
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm --prefix apps/web run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web

EXPOSE 3000

CMD ["npm", "--prefix", "apps/web", "run", "start"]
