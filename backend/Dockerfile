# syntax=docker/dockerfile:1.7
# One image recipe for every backend service: docker build --build-arg SERVICE=gateway -t platform/gateway backend
ARG GO_IMAGE=golang:1.26.10-alpine
ARG RUNTIME_IMAGE=gcr.io/distroless/static-debian12:nonroot

FROM ${GO_IMAGE} AS build
ARG SERVICE
ARG COMMAND=api
# PACKAGE builds something other than a service's command, e.g. ./tools/db-roles.
ARG PACKAGE=
ARG VERSION=dev
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN test -n "$SERVICE" || (echo "SERVICE build argument is required" && exit 1)
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/app ${PACKAGE:-./services/${SERVICE}/cmd/${COMMAND}}

FROM ${RUNTIME_IMAGE}
ARG SERVICE
ARG VERSION=dev
LABEL org.opencontainers.image.title="${SERVICE}" org.opencontainers.image.version="${VERSION}"
ENV SERVICE_NAME=${SERVICE} SERVICE_VERSION=${VERSION}
COPY --from=build /out/app /app
USER nonroot:nonroot
EXPOSE 8080 9090
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 CMD ["/app", "healthcheck"]
ENTRYPOINT ["/app"]
