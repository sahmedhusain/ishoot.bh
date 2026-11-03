// Generate runtime input contracts from server-action types; unresolved types fail generation.
const fs = require('node:fs'), path = require('node:path');
let ts;
try {
  ts = require('typescript');
} catch {
  ts = require(path.resolve(__dirname, '../packages/api-client/node_modules/typescript'));
}
const declarations = new Map(), functions = new Map(), actionFiles = [];
function visitDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) visitDirectory(filename);
    else if (/\.tsx?$/.test(filename)) {
      const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
      for (const node of source.statements) {
        if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) declarations.set(node.name.text, node);
        if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node);
      }
      if (directory === 'apps/admin/app/actions') actionFiles.push({ filename, source });
    }
  }
}
visitDirectory('../apps/admin/lib/database'); visitDirectory('apps/admin/app/actions');
function members(nodes) {
  const fields = {};
  for (const field of nodes) if (ts.isPropertySignature(field)) fields[field.name.getText().replaceAll('"', '')] = { ...schema(field.type), optional: !!field.questionToken };
  return { kind: 'object', fields };
}
function schema(node) {
  if (!node) throw Error('Missing type');
  const primitive = { [ts.SyntaxKind.StringKeyword]: 'string', [ts.SyntaxKind.NumberKeyword]: 'number', [ts.SyntaxKind.BooleanKeyword]: 'boolean', [ts.SyntaxKind.UnknownKeyword]: 'unknown' }[node.kind];
  if (primitive) return { kind: primitive };
  if (ts.isLiteralTypeNode(node)) return { kind: 'literal', value: node.literal.kind === ts.SyntaxKind.NullKeyword ? null : node.literal.kind === ts.SyntaxKind.TrueKeyword ? true : node.literal.kind === ts.SyntaxKind.FalseKeyword ? false : ts.isNumericLiteral(node.literal) ? Number(node.literal.text) : node.literal.text };
  if (ts.isUnionTypeNode(node)) return { kind: 'union', variants: node.types.map(schema) };
  if (ts.isTypeLiteralNode(node)) return members(node.members);
  if (ts.isArrayTypeNode(node)) return { kind: 'array', element: schema(node.elementType) };
  if (ts.isParenthesizedTypeNode(node)) return schema(node.type);
  if (ts.isImportTypeNode(node)) { const d = declarations.get(node.qualifier.text); if (!d) throw Error("Unresolved import " + node.qualifier.text); return ts.isInterfaceDeclaration(d) ? members(d.members) : schema(d.type); }
  if (ts.isTypeReferenceNode(node)) {
    const name = node.typeName.getText();
    if (name === 'Record') return { kind: 'record', element: schema(node.typeArguments[1]) };
    if (name === 'Array') return { kind: 'array', element: schema(node.typeArguments[0]) };
    if (name === 'Partial') { const result = schema(node.typeArguments[0]); return { ...result, fields: Object.fromEntries(Object.entries(result.fields).map(([key, value]) => [key, { ...value, optional: true }])) }; }
    if (name === 'Pick' || name === 'Omit') { const result = schema(node.typeArguments[0]); const keySchema = schema(node.typeArguments[1]); const keys = (keySchema.variants || [keySchema]).map(v => v.value); return { ...result, fields: Object.fromEntries(Object.entries(result.fields).filter(([key]) => name === 'Pick' ? keys.includes(key) : !keys.includes(key))) }; }
    const declaration = declarations.get(name);
    if (!declaration) throw Error('Unresolved type ' + name);
    return ts.isInterfaceDeclaration(declaration) ? members(declaration.members) : schema(declaration.type);
  }
  if (ts.isIndexedAccessTypeNode(node)) {
    if (ts.isTypeReferenceNode(node.objectType) && node.objectType.typeName.getText() === 'Parameters') {
      const query = node.objectType.typeArguments[0]; const fn = functions.get(query.exprName.getText());
      if (!fn) throw Error('Unresolved function ' + query.exprName.getText());
      return schema(fn.parameters[Number(node.indexType.literal.text)].type);
    }
    const result = schema(node.objectType); return result.fields[node.indexType.literal.text];
  }
  throw Error('Unsupported runtime type: ' + node.getText());
}
const contracts = {};
for (const { filename, source } of actionFiles) {
  let text = source.text; const insertions = [];
  for (const fn of source.statements) if (ts.isFunctionDeclaration(fn) && fn.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
    contracts[fn.name.text] = { kind: 'object', fields: Object.fromEntries(fn.parameters.map(p => [p.name.text, { ...schema(p.type), optional: !!p.questionToken || !!p.initializer }])) };
    if (!fn.body.getText(source).includes(`validateActionArguments("${fn.name.text}"`)) insertions.push({ pos: fn.body.getStart(source) + 1, text: `\n  validateActionArguments("${fn.name.text}", { ${fn.parameters.map(p => p.name.text).join(', ')} });` });
  }
  if (process.argv.includes("--check") && insertions.length) throw Error("Missing runtime validation in " + filename);
  for (const edit of insertions.reverse()) text = text.slice(0, edit.pos) + edit.text + text.slice(edit.pos);
  if (insertions.length && !text.includes('from "../../lib/action-input"')) text = text.replace('"use server";', '"use server";\nimport { validateActionArguments } from "../../lib/action-input";');
  if (!process.argv.includes('--check')) fs.writeFileSync(filename, text);
}
// Dynamic roles are database IDs, not a closed enum. Check role existence/privilege separately.
for (const entry of Object.values(contracts)) for (const [key, value] of Object.entries(entry.fields)) {
  if (key === 'role') entry.fields[key] = { kind: 'string', optional: value.optional };
  if (value.fields?.role) value.fields.role = { kind: 'string', optional: value.fields.role.optional };
}
const target = 'apps/admin/lib/action-schemas.json', generated = JSON.stringify(contracts, null, 2) + '\n';
if (process.argv.includes('--check')) { if (fs.readFileSync(target, 'utf8') !== generated) throw Error('Server-action runtime schemas are stale'); }
else fs.writeFileSync(target, generated);
console.log(`Runtime schemas: ${Object.keys(contracts).length} actions`);
