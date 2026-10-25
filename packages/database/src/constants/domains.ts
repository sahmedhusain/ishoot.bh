// Company domains (CompanySetting.websiteDomain / adminDomain). Runtime-free, so both apps and the setup
// wizard share one rule for what a domain is.

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/**
 * "https://Www.Example.com/about" → "www.example.com". Returns "" for anything that is not a public host name:
 * no IP addresses, no localhost, at least one dot and a letter-only top-level label.
 */
export function normalizeDomain(input: string | null | undefined): string {
  let value = (input ?? "").trim().toLowerCase();
  if (!value) return "";
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").split(/[/?#]/)[0].replace(/\.$/, "");
  if (value.includes("@") || value.includes(":")) return "";
  const labels = value.split(".");
  if (labels.length < 2 || value.length > 253 || !labels.every((label) => LABEL.test(label))) return "";
  if (!/^[a-z]{2,63}$/.test(labels[labels.length - 1])) return "";
  if (value === "localhost" || value.endsWith(".localhost") || value.endsWith(".local")) return "";
  return value;
}

/** The https origin of a domain, or "" when there is none. */
export const domainOrigin = (domain: string | null | undefined) => {
  const host = normalizeDomain(domain);
  return host ? `https://${host}` : "";
};

/** The address the domain check fetches; it proves the domain reaches this installation. */
export const HEALTH_PATH = "/api/health";

/** DNS records a company adds at its domain registrar, for the two hosting options in docs/OPERATIONS.md. */
export function dnsRecords(domain: string) {
  const host = normalizeDomain(domain);
  if (!host) return [];
  const apex = host.split(".").length === 2;
  return [
    { hosting: "vercel", type: apex ? "A" : "CNAME", name: apex ? "@" : host.split(".")[0], value: apex ? "76.76.21.21" : "cname.vercel-dns.com" },
    { hosting: "server", type: "A", name: apex ? "@" : host.split(".")[0], value: null },
  ] as const;
}
