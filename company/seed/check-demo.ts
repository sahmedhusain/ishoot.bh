import assert from "node:assert/strict";
import path from "node:path";
import dotenv from "dotenv";
import { demoPreset } from "./demo-presets";
import { loadCompanyProfile } from "../tools/company-profile";
import { listModules, getCompanyConfiguration, listProducts } from "../../apps/admin/lib/api";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

async function main() {
  const preset = demoPreset(process.env.SEED_PRESET?.trim() || "media", process.env.SEED_STYLE?.trim());
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

  const inventoryEnabled = modules.get("inventory") ?? true;
  if (inventoryEnabled) {
    const productsList = await listProducts().catch(() => []);
    const products = Array.isArray(productsList) ? productsList : [];
    assert.equal(products.length > 0, true, "products");
    console.log(`✅ Demo check passed: ${products.length} products available via Go backend API`);
  } else {
    console.log(`✅ Demo check passed for preset "${preset.id}" (${profile.display.nameEn})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
