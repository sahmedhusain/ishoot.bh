// Server-side client for the Go backend services (docs/backend). Calls go through the gateway with this app's
// service token (docs/adr/0011), or with a signed-in person's access token. Never import from client components.
export { ApiError, isApiError } from "./errors";
export * from "./files";
export * from "./identity";
export * from "./itsm";
export * from "./itsm-desk";
export * from "./system";
export * from "./audit";
export * from "./notify";
export * from "./inbox";
export * from "./realtime";

export * from "./staff-administration";
export { verifyIdentityCaller } from "./identity-caller";
export * from "./company";
export * from "./operations";
export * from "./cms";
export * from "./sales";
export * from "./finance";
export * from "./workflow";
export * from "./hr";
export * from "./inventory";
export * from "./commerce";
export * from "./delivery";
export * from "./normalize";
