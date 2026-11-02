import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { expect, test, vi } from "vitest";

const source = readFileSync("tests/e2e/serve.cjs", "utf8");

function server(app: string, mode?: string) {
  const children: EventEmitter[] = [];
  const spawn = vi.fn(() => {
    const child = Object.assign(new EventEmitter(), { kill: vi.fn() });
    children.push(child);
    return child;
  });
  const exit = vi.fn();
  runInNewContext(source, {
    URL,
    __dirname: path.resolve("tests/e2e"),
    require: (name: string) => {
      if (name === "node:path") return path;
      if (name === "node:child_process") return { spawn };
      if (name === "node:fs")
        return { readFileSync: () => "original", writeFileSync: vi.fn() };
      if (name === "dotenv") return { config: vi.fn() };
      throw new Error(name);
    },
    process: {
      env: { E2E_SERVER_MODE: mode, DATABASE_URL: "postgres://localhost/db" },
      argv: ["node", "serve.cjs", app, "3015"],
      on: vi.fn(),
      exit,
    },
    setInterval: () => ({ unref() {} }),
    clearInterval: vi.fn(),
  });
  return { spawn, children, exit };
}

test("IT compiles before listening; a failed build never starts a stale server", () => {
  const it = server("it");
  expect(it.spawn.mock.calls[0][1]).toEqual(["build", "--webpack"]);
  expect(it.spawn.mock.calls[0][2].env).toMatchObject({
    NODE_ENV: "production",
    NEXT_DIST_DIR: ".next-e2e",
  });
  it.children[0].emit("exit", 0, null);
  expect(it.spawn.mock.calls[1][1]).toEqual(["start", "-p", "3015"]);
  it.children[1].emit("exit", 1, null);
  expect(it.exit).toHaveBeenCalledWith(1);

  const failed = server("it");
  failed.children[0].emit("exit", 1, null);
  expect(failed.spawn).toHaveBeenCalledTimes(1);
  expect(failed.exit).toHaveBeenCalledWith(1);
});

test("prebuilt mode starts directly and other local apps keep their isolated development build", () => {
  expect(server("it", "start").spawn.mock.calls[0][1]).toEqual([
    "start",
    "-p",
    "3015",
  ]);
  const admin = server("admin");
  expect(admin.spawn.mock.calls[0][1]).toEqual([
    "dev",
    "--turbopack",
    "-p",
    "3015",
  ]);
  expect(admin.spawn.mock.calls[0][2].env.NEXT_DIST_DIR).toBe(".next-e2e-3015");
});
