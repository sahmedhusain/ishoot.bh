// Server-side client for the Go backend services (docs/backend). Calls go through the gateway with this app's
// service token (docs/adr/0011), or with a signed-in person's access token. Never import from client components.
export { ApiError, isApiError } from "./errors";
export * from "./files";
export * from "./identity";
export * from "./itsm";
export * from "./itsm-desk";
