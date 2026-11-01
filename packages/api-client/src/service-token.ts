import { importJWK, SignJWT, type JWK } from "jose";
import { serviceCaller, serviceTokenTtlSeconds } from "./config";

/** The issuer prefix and audience the services expect (backend/pkg/authn). */
const ISSUER_PREFIX = "service:";
const AUDIENCE = "platform:service";

type Signer = { key: CryptoKey | Uint8Array; kid: string };
let signer: Promise<Signer> | undefined;
let cached: { token: string; renewAt: number } | undefined;

function loadSigner(caller: string): Promise<Signer> {
  const name = `${caller.toUpperCase()}_SERVICE_KEY`;
  const encoded = process.env[name];
  if (!encoded) throw new Error(`${name} is not set: run ./run.sh env secrets`);
  const jwk = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  ) as JWK;
  if (!jwk.kid?.startsWith(`${caller}:`))
    throw new Error(`${name} must have a kid starting with "${caller}:"`);
  return importJWK(jwk, "EdDSA").then((key) => ({ key, kid: jwk.kid! }));
}

/** A short-lived token proving this app is the caller. Reused until shortly before it expires. */
export async function serviceToken(): Promise<string> {
  const now = Date.now();
  if (cached && now < cached.renewAt) return cached.token;
  const caller = serviceCaller();
  signer ??= loadSigner(caller);
  const { key, kid } = await signer;
  const ttl = serviceTokenTtlSeconds();
  const token = await new SignJWT({ token_use: "access" })
    .setProtectedHeader({ alg: "EdDSA", kid, typ: "JWT" })
    .setIssuer(ISSUER_PREFIX + caller)
    .setSubject(caller)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(now / 1000) + ttl)
    .sign(key);
  // Renew at 80% of the lifetime so a token never expires in flight.
  cached = { token, renewAt: now + ttl * 800 };
  return token;
}
