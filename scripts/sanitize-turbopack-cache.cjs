const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const searchDirs = [root];
for (const sub of ['apps', 'packages']) {
  const dir = path.join(root, sub);
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) searchDirs.push(full);
    }
  }
}

function checkAndSanitize(dir) {
  if (!fs.existsSync(dir)) return;
  let hasInvalidFiles = false;

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        // Turbopack RocksDB persistence directory fails if filenames contain spaces (e.g. "LOG 2", "00000014 2.sst")
        if (entry.name.includes(' ')) {
          hasInvalidFiles = true;
        }
      }
    }
  }

  walk(dir);

  if (hasInvalidFiles) {
    console.log(`[sanitize] Clearing corrupted Turbopack cache: ${path.relative(root, dir)}`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

for (const base of searchDirs) {
  const turbopackCacheDir = path.join(base, '.next', 'dev', 'cache', 'turbopack');
  checkAndSanitize(turbopackCacheDir);
}
