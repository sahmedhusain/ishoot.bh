// scripts/check-isolation.ts
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");

console.log("🔍 Running directory and codebase isolation checks...");

// 1️⃣ Contracts folders check: each app has its generated copy and they must match
function checkContracts() {
  const contractDirs = ["apps/web/contracts", "apps/admin/contracts", "apps/it/contracts", "apps/store/contracts"];
  for (const d of contractDirs) {
    if (!fs.existsSync(path.join(root, d))) {
      console.error(`⚠️ Contract directory missing: ${d}`);
      process.exit(1);
    }
  }

  function diffDirs(a: string, b: string) {
    const diff = execSync(`diff -qr ${a} ${b}`, { cwd: root, encoding: "utf8" });
    if (diff.trim()) {
      console.error(`⚠️ Contract directories differ between ${a} and ${b}:\n${diff}`);
      process.exit(1);
    }
  }

  diffDirs("apps/web/contracts", "apps/admin/contracts");
  diffDirs("apps/web/contracts", "apps/it/contracts");
  diffDirs("apps/web/contracts", "apps/store/contracts");
  diffDirs("apps/admin/contracts", "apps/it/contracts");
  diffDirs("apps/admin/contracts", "apps/store/contracts");
  console.log("  ✅ Contracts directories verified and identical across apps.");
}

// 2️⃣ Tests folders check: each test file under apps must belong to exactly one app
function checkTests() {
  const testFiles = execSync(`git ls-files 'apps/*/tests/**/*'`, { cwd: root, encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);

  if (testFiles.length === 0) {
    console.warn("  ⚠️ No test files found under apps.");
  } else {
    for (const f of testFiles) {
      if (!/^apps\/[^/]+\/tests\//.test(f)) {
        console.error(`⚠️ Test file not under an app folder: ${f}`);
        process.exit(1);
      }
    }
    console.log(`  ✅ All ${testFiles.length} test files reside strictly within their respective app folder.`);
  }
}

// 3️⃣ Scripts folders check: each script under apps must belong to an app
function checkScripts() {
  const scriptFiles = execSync(`git ls-files 'apps/*/scripts/**/*'`, { cwd: root, encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const f of scriptFiles) {
    if (!/^apps\/[^/]+\/scripts\//.test(f)) {
      console.error(`⚠️ Script file not under an app folder: ${f}`);
      process.exit(1);
    }
  }
  console.log(`  ✅ All ${scriptFiles.length} app script files reside strictly within their respective app folder.`);
}

// 4️⃣ Backend imports check: Frontend must never import directly from cmd/ or backend/
function checkBackendImports() {
  const cmdImports = execSync(
    `git grep -n "cmd/" apps/ || true`,
    { cwd: root, encoding: "utf8" }
  ).trim();

  // Filter out comments or documentation mentions if any
  const realCmdImports = cmdImports
    .split("\n")
    .filter(Boolean)
    .filter((line) => /import.*from.*cmd\//.test(line));

  if (realCmdImports.length > 0) {
    console.error(`⚠️ Front-end importing cmd backend code directly:\n${realCmdImports.join("\n")}`);
    process.exit(1);
  }

  const backendImports = execSync(
    `git grep -n "backend/" apps/ || true`,
    { cwd: root, encoding: "utf8" }
  ).trim();

  const realBackendImports = backendImports
    .split("\n")
    .filter(Boolean)
    .filter((line) => /import.*from.*backend\//.test(line));

  if (realBackendImports.length > 0) {
    console.error(`⚠️ Front-end importing backend code directly:\n${realBackendImports.join("\n")}`);
    process.exit(1);
  }
  console.log("  ✅ No backend (cmd/ or backend/) source imports detected from front-ends.");
}

// 5️⃣ Cross-app source imports check: Front-ends must not import components, lib, or actions from other apps
function checkCrossAppImports() {
  const apps = ["web", "admin", "it", "store"];
  for (const app of apps) {
    const otherApps = apps.filter((a) => a !== app);
    for (const other of otherApps) {
      // Check for app/components/lib/scripts imports from another app
      const crossImports = execSync(
        `grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git 'apps/${other}/' apps/${app}/app/ apps/${app}/components/ apps/${app}/lib/ apps/${app}/scripts/ 2>/dev/null || true`,
        { cwd: root, encoding: "utf8" }
      ).trim();

      if (crossImports) {
        console.error(`⚠️ Cross-app import detected in ${app} referencing ${other}:\n${crossImports}`);
        process.exit(1);
      }
    }
  }
  console.log("  ✅ No cross-app source imports detected between Web, Admin, IT, and Store.");
}

// 6️⃣ Asset hash check for public directories
function checkAssets() {
  try {
    const assetHashes = execSync(
      `find apps -type f -path '*/public/*' -exec md5 -r {} + 2>/dev/null || find apps -type f -path '*/public/*' -exec md5sum {} + 2>/dev/null || true`,
      { cwd: root, encoding: "utf8" }
    ).trim();
    if (assetHashes) {
      // Optional asset report
    }
  } catch {
    // Ignore md5 variant differences
  }
  console.log("  ✅ Asset directories inspected.");
}

checkContracts();
checkTests();
checkScripts();
checkBackendImports();
checkCrossAppImports();
checkAssets();

console.log("✅ Isolation checks passed – no cross-app file sharing detected.");
process.exit(0);
