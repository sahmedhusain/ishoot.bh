const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const LOGS_DIR = path.join(ROOT, ".local", "qa-logs");
const MANIFEST_PATH = path.join(ROOT, ".local", "qa-manifest.json");
const IT_TOKEN_CACHE_PATH = path.join(LOGS_DIR, "it-token-cache.json");

let cachedEnv = null;

function loadRootEnv() {
  if (cachedEnv) return cachedEnv;
  const parsed = {};
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    for (const rawLine of fs.readFileSync(envPath, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      // Strip inline comment only when unquoted
      if (val.startsWith('"')) {
        const end = val.indexOf('"', 1);
        if (end !== -1) val = val.slice(1, end);
      } else if (val.startsWith("'")) {
        const end = val.indexOf("'", 1);
        if (end !== -1) val = val.slice(1, end);
      } else {
        val = val.replace(/\s+#.*$/, "").trim();
      }
      parsed[m[1]] = val;
    }
  }
  cachedEnv = { ...parsed, ...process.env };
  return cachedEnv;
}

const tokenCache = new Map();

function mintServiceToken(caller = "admin") {
  const nowSec = Math.floor(Date.now() / 1000);
  const hit = tokenCache.get(caller);
  if (hit && hit.exp - 30 > nowSec) return hit.token;

  const env = loadRootEnv();
  const keyVar = `${caller.toUpperCase()}_SERVICE_KEY`;
  const encoded = env[keyVar];
  if (!encoded) {
    throw new Error(`${keyVar} is not configured in .env or process.env`);
  }
  const jwk = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  const privateKey = crypto.createPrivateKey({ key: jwk, format: "jwk" });
  const b64u = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const exp = nowSec + 300;
  const header = b64u({ alg: "EdDSA", kid: jwk.kid, typ: "JWT" });
  const payload = b64u({
    token_use: "access",
    iss: `service:${caller}`,
    sub: caller,
    aud: "platform:service",
    iat: nowSec,
    exp,
  });
  const sig = crypto.sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
  const token = `${header}.${payload}.${sig}`;
  tokenCache.set(caller, { token, exp });
  return token;
}

const TOTP_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateTotp(secret, atMs = Date.now()) {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const bits = [...clean]
    .map((c) => TOTP_ALPHABET.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const bytes = bits.match(/.{8}/g);
  if (!bytes) throw new Error("Invalid TOTP secret");
  const key = Buffer.from(bytes.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 30_000)));
  const mac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

function readItTokenCache() {
  try {
    if (!fs.existsSync(IT_TOKEN_CACHE_PATH)) return {};
    return JSON.parse(fs.readFileSync(IT_TOKEN_CACHE_PATH, "utf8")) || {};
  } catch {
    return {};
  }
}

function writeItTokenCache(data) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(IT_TOKEN_CACHE_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function clearItTokenCache() {
  if (fs.existsSync(IT_TOKEN_CACHE_PATH)) {
    fs.unlinkSync(IT_TOKEN_CACHE_PATH);
  }
}

function decodeJwtExp(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return 0;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return Number(payload.exp || 0);
  } catch {
    return 0;
  }
}

const TOTP_STATE_PATH = path.join(LOGS_DIR, "it-totp-state.json");

function readTotpState() {
  try {
    if (!fs.existsSync(TOTP_STATE_PATH)) return {};
    return JSON.parse(fs.readFileSync(TOTP_STATE_PATH, "utf8")) || {};
  } catch {
    return {};
  }
}

async function acquireItTotp(secret) {
  const cache = readItTokenCache();
  const state = readTotpState();
  const secretKey = crypto.createHash("sha256").update(secret).digest("hex");
  const lastStep = Number.isFinite(state[secretKey]) ? state[secretKey] : -1;
  const now = Date.now();
  let step = Math.floor(now / 30_000);
  const remainingMs = (step + 1) * 30_000 - now;
  if (step <= lastStep || remainingMs < 2_500) {
    const nextStep = Math.max(step, lastStep) + 1;
    const waitMs = Math.max(0, nextStep * 30_000 + 250 - Date.now());
    if (waitMs > 0) {
      await new Promise((r) => setTimeout(r, waitMs));
    }
    step = Math.floor(Date.now() / 30_000);
  }
  const code = generateTotp(secret, Date.now());
  state[secretKey] = step;
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(TOTP_STATE_PATH, JSON.stringify(state, null, 2), { mode: 0o600 });
  writeItTokenCache({ ...cache, lastTotpStep: step });
  return { code, step };
}

async function getCachedItAuth(gatewayUrl) {
  const env = loadRootEnv();
  const gw = gatewayUrl || env.API_URL || "http://127.0.0.1:8080";
  const cache = readItTokenCache();
  const nowSec = Math.floor(Date.now() / 1000);

  if (cache.accessToken && Number(cache.exp || 0) - 60 > nowSec) {
    return cache;
  }

  const itSvcToken = mintServiceToken("it");
  if (cache.refreshToken) {
    try {
      const refRes = await fetch(`${gw}/v1/identity/it/sessions/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${itSvcToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: cache.refreshToken }),
        signal: AbortSignal.timeout(8000),
      });
      if (refRes.ok) {
        const refBody = await refRes.json();
        const nextCache = {
          ...cache,
          ...refBody,
          exp: decodeJwtExp(refBody.accessToken) || nowSec + 300,
        };
        writeItTokenCache(nextCache);
        return nextCache;
      }
    } catch {
      // Fall through to full TOTP login if refresh token expired or revoked
    }
  }

  const accountFile = path.resolve(
    process.env.E2E_IT_ACCOUNT_FILE || path.join(ROOT, "apps/it/tests/.results/it-account.json"),
  );
  if (!fs.existsSync(accountFile)) {
    throw new Error(`IT account file missing at ${accountFile}`);
  }
  const acc = JSON.parse(fs.readFileSync(accountFile, "utf8"));
  const username = acc.username || env.IT_ADMIN_USERNAME || "BA0001";
  const { code, step } = await acquireItTotp(acc.secret);
  const res = await fetch(`${gw}/v1/identity/it/sessions/login`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${itSvcToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: username, password: acc.password, otp: code }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IT login failed (${res.status}): ${text}`);
  }
  const body = await res.json();
  const nextCache = {
    ...body,
    exp: decodeJwtExp(body.accessToken) || nowSec + 300,
    lastTotpStep: step,
  };
  writeItTokenCache(nextCache);
  return nextCache;
}

function sanitizeSuiteName(name) {
  return String(name || "default")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function suiteLogPath(suiteName) {
  return path.join(LOGS_DIR, `browser-${sanitizeSuiteName(suiteName)}.jsonl`);
}

function resetSuiteLog(suiteName) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(suiteLogPath(suiteName), "");
}

function appendJsonlLog(suiteName, record) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.appendFileSync(
    suiteLogPath(suiteName),
    JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n",
  );
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing coverage manifest at ${MANIFEST_PATH}. Run: node scripts/generate-coverage-manifest.cjs`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

async function fetchMailpitMessage(toEmail, subjectRegex = null, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  const target = toEmail.toLowerCase();
  while (Date.now() < deadline) {
    const res = await fetch("http://127.0.0.1:8025/api/v1/messages", {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const messages = Array.isArray(data.messages) ? data.messages : [];
      for (const msg of messages) {
        const recipients = (msg.To || []).map((t) => String(t.Address || "").toLowerCase());
        if (!recipients.includes(target)) continue;
        if (subjectRegex && !subjectRegex.test(String(msg.Subject || ""))) continue;
        const detailRes = await fetch(`http://127.0.0.1:8025/api/v1/message/${msg.ID}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (detailRes.ok) {
          return await detailRes.json();
        }
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for Mailpit message to ${toEmail}`);
}

function extractOtpCode(msg) {
  const body = String(msg?.Text || msg?.HTML || "");
  const m = body.match(/\b(\d{6})\b/);
  if (!m) throw new Error(`No 6-digit OTP found in Mailpit message: ${body.slice(0, 200)}`);
  return m[1];
}

function extractResetUrl(msg) {
  const body = String(msg?.Text || msg?.HTML || "");
  const m = body.match(/https?:\/\/[^\s"'<>]+(?:reset|token=)[^\s"'<>]*/i);
  if (!m) throw new Error(`No reset URL found in Mailpit message: ${body.slice(0, 200)}`);
  return m[0].replace(/&amp;/g, "&");
}

async function fetchWhatsAppMessages() {
  const res = await fetch("http://127.0.0.1:8095/sandbox/messages", {
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    throw new Error(`WhatsApp sandbox returned HTTP ${res.status}`);
  }
  return await res.json();
}

module.exports = {
  ROOT,
  LOGS_DIR,
  MANIFEST_PATH,
  loadRootEnv,
  mintServiceToken,
  generateTotp,
  acquireItTotp,
  getCachedItAuth,
  clearItTokenCache,
  resetSuiteLog,
  appendJsonlLog,
  loadManifest,
  fetchMailpitMessage,
  extractOtpCode,
  extractResetUrl,
  fetchWhatsAppMessages,
};
