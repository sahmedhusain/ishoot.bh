// Settings of the backend client, from the environment. Server-side only: never import this from client components.

/** Which app is calling; its key is <CALLER>_SERVICE_KEY (docs/adr/0011). The admin back end is the default caller. */
export const serviceCaller = () => process.env.SERVICE_CALLER || "admin";

/** The gateway's base URL, e.g. http://127.0.0.1:8080. */
export function apiUrl() {
  const url = process.env.API_URL;
  if (!url)
    throw new Error("API_URL is not set: point it at the backend gateway");
  return url.replace(/\/+$/, "");
}

const positive = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Per-request timeout. */
export const apiTimeoutMs = () => positive(process.env.API_TIMEOUT_MS, 15_000);

/** How long a service token is valid; a new one is signed shortly before it expires. */
export const serviceTokenTtlSeconds = () =>
  positive(process.env.SERVICE_TOKEN_TTL_SECONDS, 300);
