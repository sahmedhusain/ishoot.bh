
export const serviceCaller = () => process.env.SERVICE_CALLER || "admin";

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

export const apiTimeoutMs = () => positive(process.env.API_TIMEOUT_MS, 15_000);

export const serviceTokenTtlSeconds = () =>
  positive(process.env.SERVICE_TOKEN_TTL_SECONDS, 300);
