import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "vitest";

const root = path.resolve(__dirname, "../../../../");
const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { cwd: root },
)
  .toString()
  .split("\0")
  .filter(Boolean);

// Folders synced by iCloud or Dropbox leave conflict copies such as "seed 2.ts" next to the real file.
test("no sync-conflict copies are committed", () => {
  expect(
    files.filter(
      (file) =>
        / \d+(\.[^/.]+)?$/.test(path.basename(file)) && !file.includes("/raw/"),
    ),
  ).toEqual([]);
});

test("apps keep no files in public/ (company files live in company/profiles)", () => {
  expect(files.filter((file) => /^apps\/[^/]+\/public\//.test(file))).toEqual(
    [],
  );
});

// Next rewrites these when it starts with another build folder (test servers); that must never be committed.
test("tsconfig and next-env reference only the standard .next folder", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  for (const app of ["admin", "web"])
    for (const file of ["tsconfig.json", "next-env.d.ts"])
      expect(
        fs.readFileSync(path.join(root, "apps", app, file), "utf8"),
        `apps/${app}/${file}`,
      ).not.toMatch(/\.next-e2e/);
});
