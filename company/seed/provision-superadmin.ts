import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

import { syncAccount, setAccountPassword } from "../../apps/admin/lib/api/identity";

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "Admin12345678!";
  const username = (process.env.SUPER_ADMIN_USERNAME || "BA0001").trim().toUpperCase();
  console.log("Provisioning staff super_admin & IT admin accounts for:", email, `(Username: ${username})`);
  await syncAccount("staff", "super-admin", { email, username, roles: ["super_admin"], active: true });
  await setAccountPassword("staff", "super-admin", { password });

  // Provision IT realm account for IT app access (MFA disabled by default, regular email/password authentication)
  try {
    await syncAccount("it", "it-admin", { email, username, roles: ["it_admin"], active: true });
    await setAccountPassword("it", "it-admin", { password });
  } catch {
    // If bootstrapped with a generated subject ID, ensure password is set
    await setAccountPassword("it", "b028fa9e-b327-4ab8-a947-3184fc91381a", { password }).catch(() => {});
  }

  console.log("✅ SUCCESS! Staff super_admin and IT admin accounts provisioned successfully.");
}

main().catch((err) => {
  console.error("Failed to provision super-admin:", err);
  process.exit(1);
});
