import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

import { syncAccount, setAccountPassword } from "../../apps/admin/lib/api/identity";

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "Admin12345678!";
  console.log("Provisioning staff super_admin & IT admin accounts for:", email);
  await syncAccount("staff", "super-admin", { email, roles: ["super_admin"], active: true });
  await setAccountPassword("staff", "super-admin", { password });

  // Provision IT realm account for IT app access (MFA disabled by default, regular email/password authentication)
  await syncAccount("it", "it-admin", { email, roles: ["it_admin"], active: true });
  await setAccountPassword("it", "it-admin", { password });

  console.log("✅ SUCCESS! Staff super_admin and IT admin accounts provisioned successfully.");
}

main().catch((err) => {
  console.error("Failed to provision super-admin:", err);
  process.exit(1);
});
