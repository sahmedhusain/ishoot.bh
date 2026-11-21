import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STATE_PATH = path.resolve(
  __dirname,
  "../../../../../.local/qa-logs/it-totp-state.json",
);

export function totp(secret: string, at = Date.now()) {
  const bits = [...secret]
    .map((c) => ALPHABET.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const mac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(
    6,
    "0",
  );
}

export async function freshTotp(secret: string): Promise<string> {
  const secretKey = crypto.createHash("sha256").update(secret).digest("hex");
  let state: Record<string, number> = {};
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as Record<string, number>;
  } catch {
    state = {};
  }
  const lastStep = Number.isFinite(state[secretKey]) ? state[secretKey] : -1;
  const now = Date.now();
  let step = Math.floor(now / 30_000);
  const remainingMs = (step + 1) * 30_000 - now;

  if (step <= lastStep || remainingMs < 2_500) {
    const targetStep = Math.max(step, lastStep) + 1;
    const waitMs = Math.max(0, targetStep * 30_000 + 250 - Date.now());
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    step = Math.floor(Date.now() / 30_000);
  }

  state[secretKey] = step;
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  return totp(secret, Date.now());
}
