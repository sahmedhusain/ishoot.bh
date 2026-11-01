// Server-side client for the Go backend services (docs/backend). Each call goes through the gateway with this app's
// service token (docs/adr/0011). Never import from client components.
export { ApiError, isApiError } from "./errors";
export * from "./files";
