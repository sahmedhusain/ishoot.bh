import http from "node:http";

const BASE_URL = "http://localhost:3001";

interface LoginResult {
  cookies: string[];
  user: any;
}

function request(urlPath: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: Record<string, string | string[]>; text: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlPath, BASE_URL);
    const req = http.request(
      parsed,
      {
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers as Record<string, string | string[]>,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function loginAdmin(username = "BA0001", password = "Admin12345678!"): Promise<LoginResult> {
  const res = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${res.text}`);
  }
  const rawCookies = res.headers["set-cookie"];
  const cookies: string[] = [];
  if (Array.isArray(rawCookies)) {
    for (const c of rawCookies) {
      cookies.push(c.split(";")[0]);
    }
  } else if (typeof rawCookies === "string") {
    cookies.push(rawCookies.split(";")[0]);
  }
  return { cookies, user: JSON.parse(res.text).user };
}

async function main() {
  console.log("1. Logging in with username BA0001...");
  const { cookies, user } = await loginAdmin();
  console.log("   ✅ Logged in successfully:", user.fullName, `(${user.email})`);

  const cookieHeader = cookies.join("; ");
  const pages = [
    "/dashboard",
    "/dashboard/crm/deals",
    "/dashboard/crm/deals/new",
    "/dashboard/crm/contacts",
    "/dashboard/quotations",
    "/dashboard/quotations/new",
    "/dashboard/invoices",
    "/dashboard/payments",
    "/dashboard/finance",
    "/dashboard/inventory",
    "/dashboard/requests",
    "/dashboard/requests/settings",
    "/dashboard/calendar",
    "/dashboard/profile",
  ];

  console.log("\n2. Checking Admin App Pages for runtime errors & crashes...");
  let errorsCount = 0;
  for (const p of pages) {
    const res = await request(p, {
      headers: { Cookie: cookieHeader },
    });
    const hasError =
      res.status >= 500 ||
      res.text.includes("data-stck") ||
      res.text.includes("Cannot read properties of") ||
      res.text.includes("Unhandled Runtime Error");

    if (hasError) {
      console.error(`   ❌ [${res.status}] ${p} - ERROR DETECTED!`);
      const errorMatch = res.text.match(/(?:Cannot read properties of [^\n<]+|Unhandled Runtime Error[^\n<]+|data-msg="[^"]+)/i);
      if (errorMatch) {
        console.error("      Detail:", errorMatch[0]);
      }
      errorsCount++;
    } else {
      console.log(`   ✅ [${res.status}] ${p}`);
    }
  }

  if (errorsCount > 0) {
    console.error(`\n❌ Found ${errorsCount} failing pages.`);
    process.exit(1);
  } else {
    console.log("\n🎉 All checked pages rendered with 200 OK and no runtime errors!");
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
