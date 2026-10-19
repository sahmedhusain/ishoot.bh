import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "vitest";

const root = path.resolve(__dirname, "../..");
const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root })
  .toString()
  .split("\0")
  .filter(Boolean);

// Folders synced by iCloud or Dropbox leave conflict copies such as "seed 2.ts" next to the real file.
test("no sync-conflict copies are committed", () => {
  expect(files.filter((file) => / \d+(\.[^/.]+)?$/.test(path.basename(file)) && !file.includes("/raw/"))).toEqual([]);
});

test("apps keep no files in public/ (company files live in company/profiles)", () => {
  expect(files.filter((file) => /^apps\/[^/]+\/public\//.test(file))).toEqual([]);
});
