// Reproducible source inventory. Syntactic flags require review; they are not vulnerability verdicts.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? (["node_modules", "generated"].includes(item.name) || item.name.startsWith(".next"))
          ? []
          : files(path.join(dir, item.name))
        : /\.(ts|tsx)$/.test(item.name)
          ? [path.join(dir, item.name)]
          : [],
    );
}
const sources = [
  ...files(path.join(root, "apps")),
  ...files(path.join(root, "packages")),
];
const endpoints = [],
  actions = [],
  reads = [],
  fallbacks = [];
for (const file of sources) {
  const name = path.relative(root, file).replaceAll("\\", "/");
  const text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  const line = (node) =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  function visit(node) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const calls = [];
      const walk = (n) => {
        if (ts.isCallExpression(n)) calls.push(n.expression.getText(source));
        ts.forEachChild(n, walk);
      };
      if (node.body) walk(node.body);
      const record = {
        file: name,
        line: line(node),
        function: node.name.text,
        guards: calls.filter((c) =>
          /requireAuth|requirePermission|requireAttachmentAccess|requireInquiryAccess|getCurrentUser|readSubmission|readLoginInput/.test(
            c,
          ),
        ),
        dataCalls: calls.filter((c) =>
          /^(get|create|update|delete|resolve|approve|assign|reassign|confirm|return|global|search|lookup|db\.|tx\.)/.test(
            c,
          ),
        ),
      };
      if (
        /app\/api\/.*\/route\.ts$/.test(name) &&
        ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(record.function)
      )
        endpoints.push(record);
      if (/app\/actions\//.test(name)) actions.push(record);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "findMany"
    ) {
      const input = node.arguments[0];
      const bounded = !!(
        input &&
        ts.isObjectLiteralExpression(input) &&
        input.properties.some((p) => p.name?.getText(source) === "take")
      );
      reads.push({
        file: name,
        line: line(node),
        call: node.expression.getText(source),
        explicitTake: bounded,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  text.split("\n").forEach((value, index) => {
    if (
      /initialCompanyConfig|initialConfig|defaultCompany|fallback-id|confirmation_sent:\s*true|notification_sent:\s*true/.test(
        value,
      )
    )
      fallbacks.push({ file: name, line: index + 1, text: value.trim() });
  });
}
const schema = fs.readFileSync(
  path.join(root, "packages/database/prisma/schema.prisma"),
  "utf8",
);
const models = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)].map(
  (m) => ({
    name: m[1],
    indexes: [...m[2].matchAll(/@@(?:index|unique)\((.*)\)/g)].map((i) => i[1]),
  }),
);
const summary = {
  sourceFiles: sources.length,
  apiHandlers: endpoints.length,
  serverActions: actions.length,
  models: models.length,
  findManyCalls: reads.length,
  readsWithoutExplicitTake: reads.filter((r) => !r.explicitTake).length,
};
const out = path.join(root, "docs/audit-2026-10-04");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "inventory.json"),
  JSON.stringify(
    {
      summary,
      endpoints,
      actions,
      models,
      reads,
      businessFallbackReferences: fallbacks,
    },
    null,
    2,
  ) + "\n",
);
const section = (title, items) =>
  `## ${title}\n\n| Source | Function | Direct boundary calls |\n|---|---|---|\n${items.map((item) => `| ${item.file}:${item.line} | ${item.function} | ${item.guards.join(", ") || "None directly detected; inspect helpers/token validation"} |`).join("\n")}\n`;
fs.writeFileSync(
  path.join(out, "INVENTORY.md"),
  `# Platform source inventory\n\nGenerated from current source; excludes dependencies, build output and generated Prisma client. Detection is syntactic, not a statement that every path was exercised.\n\n${JSON.stringify(summary)}\n\n${section("API handlers", endpoints)}\n${section("Server actions", actions)}\n## Reads without an explicit take\n\nSome CMS collections are intentionally complete. Transaction/select projections and pagination at callers require manual review. Never add silent limits that hide records.\n\n${reads
    .filter((r) => !r.explicitTake)
    .map((r) => `- ${r.file}:${r.line} — ${r.call}`)
    .join("\n")}\n`,
);
console.log(JSON.stringify(summary));
