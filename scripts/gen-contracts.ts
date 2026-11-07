import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function main() {
  const root = path.resolve(__dirname, "..");
  const openapiPath = path.join(root, "docs/api/combined-openapi.yaml");

  if (!fs.existsSync(openapiPath)) {
    console.log("docs/api/combined-openapi.yaml not found. Generating combined openapi first...");
    execSync("go run ./cmd/generate-openapi > docs/api/combined-openapi.yaml", { cwd: root, stdio: "inherit" });
  }

  console.log("Generating TypeScript contract types from docs/api/combined-openapi.yaml...");
  const tempOutput = path.join(root, ".local/temp-api-contracts.ts");
  fs.mkdirSync(path.dirname(tempOutput), { recursive: true });

  execSync(`npx -y openapi-typescript "${openapiPath}" -o "${tempOutput}"`, {
    cwd: root,
    stdio: "inherit",
  });

  const contractContent = fs.readFileSync(tempOutput, "utf8");

  const apps = ["web", "admin", "it"];
  for (const app of apps) {
    const outDir = path.join(root, `apps/${app}/contracts`);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "api.ts");
    fs.writeFileSync(outFile, contractContent, "utf8");
    console.log(`✅ Contract generated for apps/${app}/contracts/api.ts`);
  }

  // Cleanup temp
  if (fs.existsSync(tempOutput)) {
    fs.unlinkSync(tempOutput);
  }

  console.log("✅ All per-app contracts generated successfully.");
}

main().catch((err) => {
  console.error("❌ Failed to generate contracts:", err);
  process.exit(1);
});
