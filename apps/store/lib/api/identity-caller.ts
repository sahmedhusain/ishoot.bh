import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { createLocalJWKSet, jwtVerify, type JWK } from "jose";

export async function verifyIdentityCaller(
  authorization: string | null,
): Promise<boolean> {
  if (!authorization?.startsWith("Bearer ") || authorization.length > 8192)
    return false;
  const configured = process.env.SERVICE_KEYS_FILE;
  if (!configured)
    throw new Error("SERVICE_KEYS_FILE is required for identity projections");
  let directory = process.cwd(),
    raw: string;
  for (;;) {
    try {
      raw = await readFile(resolve(directory, configured), "utf8");
      break;
    } catch (error) {
      if (
        isAbsolute(configured) ||
        dirname(directory) === directory ||
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw error;
      directory = dirname(directory);
    }
  }
  if (raw.length > 65536)
    throw new Error("Service public-key file exceeds its limit");
  const parsed = JSON.parse(raw) as { keys?: JWK[] };
  if (!Array.isArray(parsed.keys))
    throw new Error("Invalid service public keys");
  const keys = parsed.keys.filter(
    (key) =>
      key.kty === "OKP" &&
      key.crv === "Ed25519" &&
      key.kid?.startsWith("identity:") &&
      !key.d,
  );
  if (!keys.length) throw new Error("Identity service public keys are missing");
  try {
    const { payload, protectedHeader } = await jwtVerify(
      authorization.slice(7),
      createLocalJWKSet({ keys }),
      {
        issuer: "service:identity",
        audience: "platform:service",
        algorithms: ["EdDSA"],
        requiredClaims: ["sub", "iat", "exp"],
        clockTolerance: 30,
        maxTokenAge: 600,
      },
    );
    return (
      payload.sub === "identity" &&
      payload.token_use === "access" &&
      !!protectedHeader.kid?.startsWith("identity:") &&
      typeof payload.iat === "number" &&
      typeof payload.exp === "number" &&
      payload.exp - payload.iat <= 600
    );
  } catch {
    return false;
  }
}
