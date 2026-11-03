import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";
import { describe, expect, test } from "vitest";
import { getWebsiteTranslations } from "@platform/locales";
import {
  appleClientSecret,
  checkIdClaims,
  checkSignInCredentials,
  normalizePem,
  openSignInState,
  pkceChallenge,
  safeNextPath,
  sealSignInState,
  verifyIdToken,
} from "@platform/database/services/oauth-signin";

const b64 = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

describe("customer sign-in", () => {
  const state = {
    provider: "google" as const,
    state: "s",
    nonce: "n",
    verifier: "v",
    next: "/en/account",
    locale: "en",
    expires: Date.now() + 60_000,
  };

  test("the sign-in state survives the round trip only unchanged, with the right secret and in time", () => {
    const sealed = sealSignInState(state, "secret");
    expect(openSignInState(sealed, "secret")).toEqual(state);
    expect(openSignInState(sealed, "other")).toBeNull();
    const [body, mac] = sealed.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...state, next: "/en/evil" }),
    ).toString("base64url");
    expect(openSignInState(`${forged}.${mac}`, "secret")).toBeNull();
    expect(openSignInState(`${body}`, "secret")).toBeNull();
    expect(
      openSignInState(
        sealSignInState({ ...state, expires: Date.now() - 1 }, "secret"),
        "secret",
      ),
    ).toBeNull();
  });

  test("PKCE uses S256 and only website paths are followed afterwards", () => {
    expect(pkceChallenge("verifier")).toBe(
      createHash("sha256").update("verifier").digest("base64url"),
    );
    expect(safeNextPath("/ar/shop/item-1", "/ar/account")).toBe(
      "/ar/shop/item-1",
    );
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/en//evil",
      "/fr/x",
      null,
    ])
      expect(safeNextPath(bad, "/ar/account")).toBe("/ar/account");
  });

  test("the Apple client secret is an ES256 JWT the matching public key verifies, even from a one-line key", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const oneLine = pem.replace(/\n/g, " ");
    expect(normalizePem(oneLine)).toBe(pem);
    const jwt = appleClientSecret(
      {
        teamId: "TEAM123456",
        keyId: "KEY1234567",
        serviceId: "com.example.web",
        privateKey: oneLine,
      },
      1_000_000,
    );
    const [h, p, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({
      alg: "ES256",
      kid: "KEY1234567",
    });
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toMatchObject({
      iss: "TEAM123456",
      sub: "com.example.web",
      aud: "https://appleid.apple.com",
      exp: 1_000_300,
    });
    expect(
      verify(
        "sha256",
        Buffer.from(`${h}.${p}`),
        { key: publicKey, dsaEncoding: "ieee-p1363" },
        Buffer.from(s, "base64url"),
      ),
    ).toBe(true);
    expect(
      checkSignInCredentials("apple", {
        teamId: "TEAM123456",
        keyId: "KEY1234567",
        serviceId: "x",
        privateKey: pem,
      }).ok,
    ).toBe(true);
    expect(
      checkSignInCredentials("apple", {
        teamId: "TEAM123456",
        keyId: "KEY1234567",
        serviceId: "x",
        privateKey: "nope",
      }).ok,
    ).toBe(false);
    expect(
      checkSignInCredentials("google", {
        clientId: "1-abc.apps.googleusercontent.com",
        clientSecret: "s",
      }).ok,
    ).toBe(true);
    expect(
      checkSignInCredentials("google", { clientId: "abc", clientSecret: "s" })
        .ok,
    ).toBe(false);
  });

  test("ID tokens must come from the provider, for this app and this sign-in, signed by a published key", async () => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: "https://accounts.google.com",
      aud: "client",
      sub: "123",
      exp: now + 600,
      nonce: "n",
      email: "a@example.com",
      email_verified: true,
      name: "Amal",
    };
    expect(checkIdClaims("google", claims, "client", "n")).toEqual({
      sub: "123",
      email: "a@example.com",
      emailVerified: true,
      name: "Amal",
    });
    expect(() =>
      checkIdClaims("google", { ...claims, aud: "other" }, "client", "n"),
    ).toThrow();
    expect(() =>
      checkIdClaims("google", { ...claims, nonce: "x" }, "client", "n"),
    ).toThrow();
    expect(() => checkIdClaims("apple", claims, "client", "n")).toThrow();
    expect(() =>
      checkIdClaims("google", { ...claims, exp: now - 3600 }, "client", "n"),
    ).toThrow();

    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const jwk = {
      ...publicKey.export({ format: "jwk" }),
      kid: "k1",
      alg: "RS256",
    };
    const unsigned = `${b64({ alg: "RS256", kid: "k1" })}.${b64(claims)}`;
    const token = `${unsigned}.${sign("sha256", Buffer.from(unsigned), privateKey).toString("base64url")}`;
    const fetcher = (async () =>
      new Response(JSON.stringify({ keys: [jwk] }))) as typeof fetch;
    await expect(
      verifyIdToken("google", token, "client", "n", fetcher),
    ).resolves.toMatchObject({ sub: "123" });
    const tampered = `${b64({ alg: "RS256", kid: "k1" })}.${b64({ ...claims, sub: "999" })}.${token.split(".")[2]}`;
    await expect(
      verifyIdToken("google", tampered, "client", "n", fetcher),
    ).rejects.toThrow();
  });

  test("every account error the website can show has words in both languages", () => {
    for (const locale of ["en", "ar"] as const) {
      const account = getWebsiteTranslations(locale).account;
      for (const key of [
        "generic",
        "wrong_password",
        "wrong_code",
        "rateLimit",
        "customerEmailTaken",
        "customerPasswordWeak",
      ])
        expect(
          (account.errors as Record<string, string>)[key],
          `${locale} ${key}`,
        ).toBeTruthy();
      for (const key of ["expired", "cancelled", "noEmail", "generic"])
        expect(
          (account.signinNotices as Record<string, string>)[key],
        ).toBeTruthy();
    }
  });
});

test("Apple credentials reject keys that cannot produce an ES256 signature", () => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "secp384r1" });
  expect(
    checkSignInCredentials("apple", {
      teamId: "TEAM123456",
      keyId: "KEY1234567",
      serviceId: "com.example.web",
      privateKey: privateKey
        .export({ type: "pkcs8", format: "pem" })
        .toString(),
    }).ok,
  ).toBe(false);
});
