// Run: pnpm docs:api
// Writes docs/API_REFERENCE.md from the Go contracts, website/admin HTTP routes, admin actions and database models.
// Regenerate after adding contracts, routes or actions.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function walk(dir, match, found = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, match, found);
    else if (match(entry.name)) found.push(rel);
  }
  return found.sort();
}

function routes(app) {
  return walk(`apps/${app}/app/api`, (n) => n === "route.ts").map((file) => {
    const source = read(file);
    const methods = [...source.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
    const url = "/" + path.dirname(path.relative(`apps/${app}/app`, file)).split(path.sep).join("/");
    const comment = source.match(/^\/\/ (.+)$/m)?.[1] ?? source.match(/\/\*\*\s*\n?\s*\*?\s*([^*\n]+)/)?.[1] ?? "";
    return { url, methods, comment: comment.trim() };
  });
}

function actions() {
  return walk("apps/admin/app/actions", (n) => n.endsWith(".ts")).map((file) => {
    const source = read(file);
    const list = [];
    const re = /(?:\/\*\*([\s\S]*?)\*\/\s*)?export async function (\w+Action)\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(source))) {
      const body = source.slice(m.index, source.indexOf("\nexport ", m.index + 10) === -1 ? undefined : source.indexOf("\nexport ", m.index + 10));
      const permission = body.match(/requirePermission\("([\w-]+)",\s*"(\w+)"\)/);
      list.push({
        name: m[2],
        args: m[3].replace(/\s+/g, " ").replace(/:\s*[^,]+/g, "").replace(/,\s*$/, "").trim(),
        permission: permission ? `${permission[1]}:${permission[2]}` : body.includes("requireAuth(") ? "signed in" : "",
        doc: (m[1] ?? "").replace(/\s*\*\s?/g, " ").trim(),
      });
    }
    return { file: path.basename(file), list };
  }).filter((group) => group.list.length);
}

function models() {
  const schema = read("apps/admin/prisma/schema.prisma");
  return [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)].map((m) => ({
    name: m[1],
    fields: m[2].split("\n").filter((l) => /^\s+\w+\s+\w/.test(l) && !/^\s+@@/.test(l)).length,
  }));
}

const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const groups = actions();
const allModels = models();
const out = [
  "# API reference",
  "",
  "Generated from the code by `pnpm docs:api`; do not edit by hand. Input contracts for admin server actions are in `apps/admin/lib/action-schemas.json`; unmigrated data models remain in `apps/admin/prisma/schema.prisma` (browse them with `pnpm db:studio`).",
  "",
  "## Go service contracts",
  "",
  table(["Service", "OpenAPI contract"], walk("backend/services", (name) => name === "openapi.yaml").map((file) => [file.split(path.sep)[2], `[OpenAPI](../${file.split(path.sep).join("/")})`])),
  "",
  "## Website HTTP routes (`apps/web`)",
  "",
  table(["Route", "Methods", "Notes"], routes("web").map((r) => [`\`${r.url}\``, r.methods.join(", "), r.comment])),
  "",
  "## Admin HTTP routes (`apps/admin`)",
  "",
  table(["Route", "Methods", "Notes"], routes("admin").map((r) => [`\`${r.url}\``, r.methods.join(", "), r.comment])),
  "",
  `## Server actions (${groups.reduce((n, g) => n + g.list.length, 0)} in \`apps/admin/app/actions\`)`,
  "",
  "Every action checks the caller's permission (`resource:action`) before touching data, validates its input against the generated schema, and runs its writes in one transaction.",
  "",
  ...groups.flatMap((g) => [`### ${g.file}`, "", table(["Action", "Arguments", "Permission"], g.list.map((a) => [`\`${a.name}\``, a.args ? `\`${a.args}\`` : "", a.permission])), ""]),
  `## Database models (${allModels.length})`,
  "",
  allModels.map((m) => `\`${m.name}\``).join(", "),
  "",
];
fs.writeFileSync(path.join(root, "docs/API_REFERENCE.md"), out.join("\n"));
console.log(`docs/API_REFERENCE.md: ${groups.length} action files, ${allModels.length} models`);
