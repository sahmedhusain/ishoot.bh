// Audit product copy at its display boundaries. Protocols, enums, styles and diagnostics are code, not copy.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const problems = [];
const displayAttributes =
  /^(title|placeholder|alt|aria-label|label|description|emptyMessage|confirmLabel|cancelLabel|closeLabel|loadingLabel)$/;
const displayProperties =
  /^(title|label|description|message|error|text|emptyText|placeholder|recommended)$/;
const human = (value) =>
  /[A-Za-z\u0621-\u064A]/.test(value.replace(/&[a-z]+;|&#\d+;/gi, "")) &&
  !["asc", "desc"].includes(value.trim());
function cssTokens(value) {
  return value
    .trim()
    .split(/\s+/)
    .every(
      (token) =>
        /[-:/[\]]/.test(token) ||
        /^(border|flex|grid|hidden|block|relative|absolute|fixed|sticky|italic|truncate|uppercase|lowercase|antialiased)$/.test(
          token,
        ),
    );
}
function isStyle(node) {
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isJsxAttribute(n)) return !displayAttributes.test(n.name.text);
    if (
      ts.isPropertyAssignment(n) &&
      /^(className|color|style)$/.test(n.name.getText())
    )
      return true;
  }
  return false;
}
let scanned = 0;
function scan(file) {
  scanned++;
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const at = (node, reason, value) =>
    problems.push(
      `${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1} ${reason}: ${JSON.stringify(value)}`,
    );
  function visit(node) {
    if (ts.isJsxText(node) && human(node.text.trim()))
      at(node, "literal interface text", node.text.trim());
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const value = node.text;
      const p = node.parent;
      if (human(value)) {
        if (ts.isJsxAttribute(p) && displayAttributes.test(p.name.text))
          at(node, "literal interface attribute", value);
        else if (ts.isJsxExpression(p))
          at(node, "literal interface expression", value);
        else if (
          ts.isPropertyAssignment(p) &&
          displayProperties.test(p.name.getText(source))
        ) {
          // Descriptors may reference a locale key, but may not contain prose or a fixed company identity.
          if (
            !cssTokens(value) &&
            (p.name.getText(source) === "error"
              ? !/^[a-z_]+$/.test(value)
              : /\s|[\u0621-\u064A]/.test(value))
          )
            at(node, "literal copy property", value);
        } else if (
          ts.isBindingElement(p) &&
          displayAttributes.test(p.name.getText(source))
        )
          at(node, "literal component default", value);
        else if (
          ts.isCallExpression(p) &&
          /^toast\./.test(p.expression.getText(source))
        )
          at(node, "literal toast", value);
        else if (
          ts.isConditionalExpression(p) &&
          node !== p.condition &&
          !isStyle(node) &&
          !cssTokens(value) &&
          /[A-Za-z]+\s+[A-Za-z]+|[\u0621-\u064A]|\.\.\./.test(value) &&
          /\/(components|ui\/src)\//.test(file)
        )
          at(node, "literal conditional copy", value);
      }
    }
    if (ts.isTemplateExpression(node)) {
      const p = node.parent;
      const prose = [
        node.head.text,
        ...node.templateSpans.map((span) => span.literal.text),
      ].join(" ");
      if (
        /[A-Za-z]{2,}\s+[A-Za-z]{2,}|[\u0621-\u064A]/.test(prose) &&
        ((ts.isCallExpression(p) &&
          /^toast\./.test(p.expression.getText(source))) ||
          (ts.isPropertyAssignment(p) &&
            displayProperties.test(p.name.getText(source))))
      )
        at(node, "literal dynamic message (use placeholders)", prose);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".next"))
      continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.[jt]sx?$/.test(file)) scan(file);
  }
}
for (const dir of [
  "apps/admin",
  "apps/web",
  "packages/ui/src",
  "../apps/admin/lib/email",
  "../apps/admin/lib/database",
  "../apps/admin/lib/config",
])
  walk(path.join(root, dir));
if (problems.length) {
  console.error(problems.join("\n"));
  console.error(
    `${problems.length} hardcoded-copy problem(s) in ${scanned} source files.`,
  );
  process.exitCode = 1;
} else
  console.log(
    `Copy checks passed: ${scanned} source files; interface text, defaults and dynamic messages use JSON or data.`,
  );
