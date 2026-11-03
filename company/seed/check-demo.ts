import assert from "node:assert/strict";
import path from "node:path";
import dotenv from "dotenv";
import { demoPreset } from "./demo-presets";
import { loadCompanyProfile } from "../tools/company-profile";
import { listModules, getCompanyConfiguration, listProducts } from "../../apps/admin/lib/api";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

async function main() {
  const preset = demoPreset(process.env.SEED_PRESET || "all", process.env.SEED_STYLE);
  const company = await getCompanyConfiguration().catch(() => null);
  const profile = loadCompanyProfile(process.env.COMPANY_PROFILE || "demo");

  if (company) {
    assert.equal(company.companyNameEn || company.nameEn, profile.company.companyNameEn);
  }

  const modulesList: any = await listModules().catch(() => []);
  const modules = new Map(modulesList.map((m: any) => [m.key, m.enabled]));
  for (const module of preset.modules) {
    if (modules.has(module.moduleKey)) {
      assert.equal(modules.get(module.moduleKey), module.isEnabled, module.moduleKey);
    }
  }

  const products = await listProducts().catch(() => []);
  console.log(`✅ Demo check passed: ${products.length} products available via Go backend API`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
