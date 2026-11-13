import { importJWK, SignJWT, type JWK } from "jose";
import { generateKeyPairSync } from "node:crypto";
import { serviceCaller, serviceTokenTtlSeconds } from "./config";

const ISSUER_PREFIX = "service:";
const AUDIENCE = "platform:service";

type Signer = { key: CryptoKey | Uint8Array; kid: string };
let signer: Promise<Signer> | undefined;
let cached: { token: string; renewAt: number } | undefined;

function loadSigner(caller: string): Promise<Signer> {
  const name = `${caller.toUpperCase()}_SERVICE_KEY`;
  if (!process.env[name]) {
    try {
      const fs = require("node:fs");
      const path = require("node:path");
      for (const p of ["../../.env", "../.env", "./.env"]) {
        const full = path.resolve(process.cwd(), p);
        if (fs.existsSync(full)) {
          const content = fs.readFileSync(full, "utf8");
          const match = content.match(new RegExp(`^${name}="(.*?)"`, "m"));
          if (match && match[1]) {
            process.env[name] = match[1];
            break;
          }
        }
      }
    } catch {
    }
  }
  const encoded = process.env[name];
  if (!encoded) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      const { privateKey } = generateKeyPairSync("ed25519");
      const jwk = privateKey.export({ format: "jwk" }) as JWK;
      const kid = `${caller}:build`;
      return importJWK({ ...jwk, kid, alg: "EdDSA" }, "EdDSA").then((key) => ({ key, kid }));
    }
    throw new Error(`${name} is not set: run ./run.sh env secrets`);
  }
  const jwk = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  ) as JWK;
  if (!jwk.kid?.startsWith(`${caller}:`))
    throw new Error(`${name} must have a kid starting with "${caller}:"`);
  return importJWK(jwk, "EdDSA").then((key) => ({ key, kid: jwk.kid! }));
}

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
  cached = { token, renewAt: now + ttl * 800 };
  return token;
}
