import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const root = path.resolve(__dirname, "../..");

/** Runs one scripts/check-*.cjs file; the check passes when the script exits 0. */
export async function runCheck(name: string, env: NodeJS.ProcessEnv = {}) {
  try {
    const { stdout, stderr } = await promisify(execFile)(
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
    return {
      ok: true,
      output: `${stdout}${stderr}`.trim().split("\n").slice(-40).join("\n"),
    };
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    return {
      ok: false,
      output:
        `${failure.stdout ?? ""}${failure.stderr ?? ""}\n${failure.message}`
          .trim()
          .split("\n")
          .slice(-40)
          .join("\n"),
    };
  }
}
