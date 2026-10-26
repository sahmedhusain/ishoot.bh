import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(__dirname, "../..");

/** Runs one scripts/check-*.cjs file; the check passes when the script exits 0. */
export function runCheck(name: string, env: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts", `${name}.cjs`)],
    {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: "utf8",
      timeout: 170_000,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return {
    ok: result.status === 0,
    output: output.split("\n").slice(-40).join("\n"),
  };
}
