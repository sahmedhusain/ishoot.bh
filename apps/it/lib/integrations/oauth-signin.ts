

import { serverMessages } from "@platform/locales";
import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign as signData,
  timingSafeEqual,
  verify as verifyData,
} from "node:crypto";

export type SignInProvider = "google" | "apple";

export class SignInRejected extends Error {}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64url");
const fromB64url = (input: string) => Buffer.from(input, "base64url");

export const randomToken = (bytes = 32) =>
  randomBytes(bytes).toString("base64url");

export const pkceChallenge = (verifier: string) =>
  b64url(createHash("sha256").update(verifier).digest());

export interface SignInState {
  provider: SignInProvider;
  state: string;
  nonce: string;
  verifier: string;

  next: string;
  locale: string;
  expires: number;
}

export function sealSignInState(state: SignInState, secret: string) {
  const body = b64url(JSON.stringify(state));
  return `${body}.${b64url(createHmac("sha256", secret).update(`signin:${body}`).digest())}`;
}

export function openSignInState(
  cookie: string | undefined,
  secret: string,
): SignInState | null {
  if (!cookie) return null;
  const [body, mac] = cookie.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret)
    .update(`signin:${body}`)
    .digest();
  const given = fromB64url(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return null;
  try {
    const state = JSON.parse(fromB64url(body).toString("utf8")) as SignInState;
    return state.expires > Date.now() ? state : null;
  } catch {
    return null;
  }
}

export const safeNextPath = (
  next: string | null | undefined,
  fallback: string,
) =>
  next && /^\/(en|ar)(\/[A-Za-z0-9\-_/]*)?$/.test(next) && !next.includes("//")
    ? next
    : fallback;

export function googleAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  verifier: string;
  locale: string;
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    nonce: input.nonce,
    code_challenge: pkceChallenge(input.verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
    hl: input.locale,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function appleAuthUrl(input: {
  serviceId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  verifier: string;
}) {
  const params = new URLSearchParams({
    client_id: input.serviceId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    response_mode: "form_post",
    scope: "name email",
    state: input.state,
    nonce: input.nonce,
    code_challenge: pkceChallenge(input.verifier),
    code_challenge_method: "S256",
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}

export function normalizePem(text: string) {
  const match = text
    .replace(/\\n/g, "\n")
    .match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!match) return text;
  const body = match[2].replace(/\s+/g, "");
  return `-----BEGIN ${match[1]}-----\n${body.match(/.{1,64}/g)?.join("\n") ?? ""}\n-----END ${match[1]}-----\n`;
}

export function appleClientSecret(
  input: {
    teamId: string;
    keyId: string;
    serviceId: string;
    privateKey: string;
  },
  now = Math.floor(Date.now() / 1000),
) {
  const header = b64url(JSON.stringify({ alg: "ES256", kid: input.keyId }));
  const payload = b64url(
    JSON.stringify({
      iss: input.teamId,
      iat: now,
      exp: now + 300,
      aud: "https://appleid.apple.com",
      sub: input.serviceId,
    }),
  );
  const key = createPrivateKey(normalizePem(input.privateKey));
  if (
    key.asymmetricKeyType !== "ec" ||
    key.asymmetricKeyDetails?.namedCurve !== "prime256v1"
  )
    throw new SignInRejected("invalid_private_key");
  const signature = signData("sha256", Buffer.from(`${header}.${payload}`), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${payload}.${b64url(signature)}`;
}

export interface IdClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
}

export function decodeJwt(token: string): {
  header: { alg: string; kid?: string };
  claims: IdClaims;
  signed: string;
  signature: Buffer;
} {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new SignInRejected("malformed_token");
  return {
    header: JSON.parse(fromB64url(h).toString("utf8")),
    claims: JSON.parse(fromB64url(p).toString("utf8")),
    signed: `${h}.${p}`,
    signature: fromB64url(s),
  };
}

const ISSUERS: Record<SignInProvider, string[]> = {
  google: ["https://accounts.google.com", "accounts.google.com"],
  apple: ["https://appleid.apple.com"],
};
const JWKS: Record<SignInProvider, string> = {
  google: "https://www.googleapis.com/oauth2/v3/certs",
  apple: "https://appleid.apple.com/auth/keys",
};

export function checkIdClaims(
  provider: SignInProvider,
  claims: IdClaims,
  clientId: string,
  nonce: string,
  now = Math.floor(Date.now() / 1000),
) {
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!ISSUERS[provider].includes(claims.iss))
    throw new SignInRejected("wrong_issuer");
  if (!audiences.includes(clientId)) throw new SignInRejected("wrong_audience");
  if (!claims.exp || claims.exp < now - 60) throw new SignInRejected("expired");
  if (claims.nonce !== nonce) throw new SignInRejected("wrong_nonce");
  if (!claims.sub) throw new SignInRejected("no_subject");
  return {
    sub: claims.sub,
    email: claims.email ?? null,
    emailVerified:
      claims.email_verified === true || claims.email_verified === "true",
    name: claims.name ?? null,
  };
}

export async function verifyIdToken(
  provider: SignInProvider,
  token: string,
  clientId: string,
  nonce: string,
  fetcher: typeof fetch = fetch,
) {
  const { header, claims, signed, signature } = decodeJwt(token);
  if (header.alg !== "RS256") throw new SignInRejected("unexpected_algorithm");
  const response = await fetcher(JWKS[provider], {
    signal: AbortSignal.timeout(10_000),
  });
  const { keys } = (await response.json()) as {
    keys: Array<{ kid: string } & Record<string, unknown>>;
  };
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new SignInRejected("unknown_key");
  const key = createPublicKey({ key: jwk as never, format: "jwk" });
  if (!verifyData("sha256", Buffer.from(signed), key, signature))
    throw new SignInRejected("bad_signature");
  return checkIdClaims(provider, claims, clientId, nonce);
}

export async function exchangeSignInCode(
  provider: SignInProvider,
  input: {
    code: string;
    verifier: string;
    redirectUri: string;
    nonce: string;
    credentials: Record<string, string>;
  },
  fetcher: typeof fetch = fetch,
) {
  const c = input.credentials;
  const clientId = provider === "google" ? c.clientId : c.serviceId;
  const clientSecret =
    provider === "google"
      ? c.clientSecret
      : appleClientSecret({
          teamId: c.teamId,
          keyId: c.keyId,
          serviceId: c.serviceId,
          privateKey: c.privateKey,
        });
  const response = await fetcher(
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://appleid.apple.com/auth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: input.code,
        redirect_uri: input.redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: input.verifier,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const body = (await response.json()) as { id_token?: string; error?: string };
  if (!response.ok || !body.id_token)
    throw new SignInRejected(body.error || "token_exchange_failed");
  return verifyIdToken(provider, body.id_token, clientId, input.nonce, fetcher);
}

export function checkSignInCredentials(
  provider: SignInProvider,
  c: Record<string, string>,
): { ok: boolean; error?: string } {
  if (provider === "google") {
    if (!/\.apps\.googleusercontent\.com$/.test(c.clientId ?? ""))
      return { ok: false, error: serverMessages.signInGoogleClientId };
    if (!c.clientSecret)
      return { ok: false, error: serverMessages.signInGoogleSecret };
    return { ok: true };
  }
  try {
    appleClientSecret({
      teamId: c.teamId,
      keyId: c.keyId,
      serviceId: c.serviceId,
      privateKey: c.privateKey,
    });
  } catch {
    return { ok: false, error: serverMessages.signInAppleKey };
  }
  if (
    !/^[A-Z0-9]{10}$/.test(c.teamId ?? "") ||
    !/^[A-Z0-9]{10}$/.test(c.keyId ?? "")
  )
    return { ok: false, error: serverMessages.signInAppleIds };
  return { ok: true };
}
