# syntax=docker/dockerfile:1.7
# Dockerfile for Platform Web App (apps/web)
# Usage: docker build -f apps/web/Dockerfile -t platform/web:dev .

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS builder
WORKDIR /app

COPY package.json ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/it/package.json ./apps/it/
COPY apps/web/package.json ./apps/web/
COPY backend/contracts/package.json ./backend/contracts/

RUN npm --prefix apps/web install

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

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "--prefix", "apps/web", "run", "start"]
