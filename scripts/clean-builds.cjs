// Remove only regenerable build output; preserve uploads, source assets and dependencies.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let bytes = 0;

function size(file) {
  if (!fs.existsSync(file)) return 0;
  const info = fs.lstatSync(file);
  if (info.isSymbolicLink()) return 0;
  return info.isDirectory() ? fs.readdirSync(file).reduce((n, name) => n + size(path.join(file, name)), 0) : info.size;
}

const bases = [root];
for (const sub of ['apps', 'packages']) {
  const dir = path.join(root, sub);
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        bases.push(full);
      }
    }
  }
}

for (const base of bases) {
  if (!fs.existsSync(base)) continue;
  for (const name of fs.readdirSync(base)) {
    if (name !== '.turbo' && !name.endsWith('.tsbuildinfo') && !/^\.next(?:-[a-zA-Z0-9_-]+)?$/.test(name)) continue;
    const target = path.join(base, name);
    bytes += size(target);
    fs.rmSync(target, { recursive: true, force: true });
  }
}
console.log(`Removed ${(bytes / 1024 / 1024).toFixed(1)} MiB of regenerable build output`);
