// Diagnostic local baseline only. This is not a production load or p95 certification.
const { performance } = require("node:perf_hooks");
const fs = require("node:fs");
const admin = new URL(process.env.ADMIN_TEST_URL || "http://127.0.0.1:32151");
const web = new URL(process.env.WEBSITE_TEST_URL || "http://127.0.0.1:32150");
if (![admin, web].every((u) => ["127.0.0.1", "localhost"].includes(u.hostname)))
  throw Error("Local audit servers only");
async function sample(url, headers) {
  const start = performance.now();
  const response = await fetch(url, { headers });
  const bytes = (await response.arrayBuffer()).byteLength;
  if (!response.ok) throw Error(`${url.pathname}: HTTP ${response.status}`);
  return { ms: performance.now() - start, bytes };
}
async function main() {
  const login = await fetch(new URL("/api/auth/login", admin), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
    }),
  });
  if (!login.ok) throw Error(`Audit login failed: ${login.status}`);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const results = [];
  for (const route of [
    "/dashboard",
    "/dashboard/crm/contacts",
    "/dashboard/crm/deals",
    "/dashboard/invoices",
    "/dashboard/payments",
    "/dashboard/expenses",
    "/dashboard/archive",
    "/",
  ]) {
    const base = route === "/" ? web : admin;
    const headers = route === "/" ? {} : { cookie };
    await sample(new URL(route, base), headers);
    const serial = [];
    for (let i = 0; i < 10; i++)
      serial.push(await sample(new URL(route, base), headers));
    const burst = await Promise.all(
      Array.from({ length: 4 }, () => sample(new URL(route, base), headers)),
    );
    const times = serial.map((s) => s.ms).sort((a, b) => a - b);
    // Direct RSC request measures the standalone response, not a complete browser navigation.
    const rsc = await sample(new URL(route + "?_rsc=audit", base), {
      ...headers,
      RSC: "1",
    });
    results.push({
      route,
      htmlBytes: serial[0].bytes,
      rscBytes: rsc.bytes,
      medianMs: +times[5].toFixed(2),
      sampleP95Ms: +times[9].toFixed(2),
      fourConcurrentMaxMs: +Math.max(...burst.map((s) => s.ms)).toFixed(2),
    });
  }
  await fetch(new URL("/api/auth/logout", admin), {
    method: "POST",
    headers: { cookie },
  });
  const output = {
    environment:
      "Disposable local PostgreSQL; mostly empty bootstrap dataset; warm single-instance servers",
    samplesPerRoute: 10,
    concurrentRequests: 4,
    productionValidated: false,
    results,
  };
  console.log(JSON.stringify(output, null, 2));
  if (process.env.AUDIT_PROFILE_OUTPUT)
    fs.writeFileSync(
      process.env.AUDIT_PROFILE_OUTPUT,
      JSON.stringify(output, null, 2) + "\n",
    );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
