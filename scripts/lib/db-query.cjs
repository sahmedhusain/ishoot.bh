// Shared psql access for seed verification and SQL seed generation.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

function loadEnv() {
  if (process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL) return;
  if (!fs.existsSync(path.join(root, ".env"))) return;
  const env = Object.fromEntries(
    fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/).flatMap((line) => {
      const match = /^\s*([A-Z][A-Z0-9_]*)=("[^"]*"|'[^']*'|[^#\s]*)/.exec(line);
      if (!match) return [];
      return [[match[1], match[2].replace(/^["']|["']$/g, "")]];
    })
  );
  for (const key of ["DATABASE_DIRECT_URL", "DATABASE_URL"]) {
    if (env[key]) {
      process.env[key] = env[key];
      return;
    }
  }
}

function directDatabaseUrl() {
  loadEnv();
  const value = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
  if (!value) throw new Error("Set DATABASE_DIRECT_URL or DATABASE_URL in .env");
  const url = new URL(value);
  for (const key of ["pgbouncer", "connection_limit", "pool_timeout", "schema"]) url.searchParams.delete(key);
  return url.toString();
}

function composeDatabaseUrl(url) {
  const parsed = new URL(url);
  if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
    parsed.hostname = "127.0.0.1";
    parsed.port = "5432";
  }
  return parsed.toString();
}

function runPsql(args, options = {}) {
  const [url, ...psqlArgs] = args;
  const composeArgs = [composeDatabaseUrl(url), ...psqlArgs];
  try {
    return execFileSync(
      "docker",
      ["compose", "--env-file", path.join(root, ".env"), "exec", "-T", "postgres", "psql", ...composeArgs],
      { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 50 * 1024 * 1024, ...options }
    );
  } catch (composeError) {
    try {
      return execFileSync("psql", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 50 * 1024 * 1024,
        ...options,
      });
    } catch (localError) {
      throw new Error(`Compose Postgres: ${composeError.message}; local psql: ${localError.message}`);
    }
  }
}

function query(sql) {
  return runPsql([directDatabaseUrl(), "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql]).trim();
}

module.exports = { composeDatabaseUrl, directDatabaseUrl, query, runPsql };
