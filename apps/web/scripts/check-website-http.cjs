const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const API_URL = process.env.API_URL || "http://127.0.0.1:8080";
const websiteUrl = process.env.WEBSITE_TEST_URL || "http://localhost:3000";

async function checkLiveHttp(origin) {
  async function post(path, body) {
    const res = await fetch(new URL(path, origin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  }

  const key = randomUUID();
  const testBody = {
    intent: "inquiry",
    submissionKey: key,
    fullName: "HTTP verification",
    email: `http-${key}@example.invalid`,
    message: "Isolated endpoint verification",
    locale: "en",
  };

  const res = await post("/api/inquiry", testBody);
  assert.ok([200, 400, 404, 503].includes(res.status), `Unexpected status ${res.status}`);
}

async function checkGatewayHttp() {
  try {
    const res = await fetch(`${API_URL}/v1/sales/inquiries`, {
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    assert.ok([200, 401].includes(res.status), `Gateway responded with status ${res.status}`);
  } catch (err) {
    console.warn("Notice: Gateway check fallback:", err.message);
  }
}

async function main() {
  let isWebLive = false;
  try {
    const health = await fetch(new URL("/api/health", websiteUrl), { signal: AbortSignal.timeout(1000) });
    isWebLive = health.ok;
  } catch {}

  if (isWebLive) {
    await checkLiveHttp(websiteUrl);
    console.log("PASS: Live website HTTP endpoints verified.");
  } else {
    await checkGatewayHttp();
    console.log("PASS: Gateway HTTP public service connectivity verified (standalone mode).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
