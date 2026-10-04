// Remove only regenerable build output; preserve uploads, source assets and dependencies.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let bytes = 0;
function size(file) {
  const info = fs.lstatSync(file);
  if (info.isSymbolicLink()) return 0;
  return info.isDirectory() ? fs.readdirSync(file).reduce((n, name) => n + size(path.join(file, name)), 0) : info.size;
}
for (const base of [root, path.join(root, 'apps/admin'), path.join(root, 'apps/web')]) {
  for (const name of fs.readdirSync(base)) {
    if (name !== '.turbo' && name !== 'tsconfig.tsbuildinfo' && !/^\.next(?:-(?:audit|verify|website-test))?$/.test(name)) continue;
    const target = path.join(base, name);
    bytes += size(target);
    fs.rmSync(target, { recursive: true, force: true });
  }
}
console.log(`Removed ${(bytes / 1024 / 1024).toFixed(1)} MiB of regenerable build output`);
