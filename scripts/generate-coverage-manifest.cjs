#!/usr/bin/env node
/**
 * Generates .local/qa-manifest.json indexing 100% of:
 * - Pages (app/page.tsx across admin, it, store, web)
 * - Next.js API Route Handlers (app/.../route.ts + HTTP methods)
 * - Server Actions ("use server" exported functions)
 * - Components (all files under components/, exported functions/components, and API/action call sites)
 * - Go microservice Echo routes and jsoncrud RegisterTableRoutes tables
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outPath = path.join(root, ".local", "qa-manifest.json");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".next-")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out.sort();
}

function rel(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function toNextRoute(appDir, filePath, suffix) {
  const r = path.relative(appDir, filePath).split(path.sep).join("/");
  const stripped = r.replace(new RegExp(`(^|/)${suffix}$`), "");
  const segments = stripped
    .split("/")
    .filter((seg) => seg && !(seg.startsWith("(") && seg.endsWith(")")));
  return "/" + segments.join("/");
}

function extractTsExports(src) {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  for (const m of src.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const cleaned = part.trim().split(/\s+as\s+/);
      const target = (cleaned[1] || cleaned[0] || "").replace(/^type\s+/, "").trim();
      if (target && !part.trim().startsWith("type ")) names.add(target);
    }
  }
  if (/export\s+default\s+(?!function\s+[A-Za-z_$]|class\s+[A-Za-z_$])/.test(src)) {
    names.add("default");
  }
  return [...names].sort();
}

function extractApiAndActionCalls(src, fileRel, serverActionNames = null) {
  const calls = [];
  const lines = src.split("\n");
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    for (const m of line.matchAll(/(?:serviceFetch|gatewayFetch|apiFetch|fetch)\s*(?:<[^>]*>)?\s*\(\s*([`'"][^`'"]+[`'"])/g)) {
      const url = m[1].slice(1, -1);
      const snippet = lines.slice(idx, Math.min(lines.length, idx + 6)).join(" ");
      const mm = snippet.match(/method\s*:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/i);
      calls.push({
        file: fileRel,
        line: lineNo,
        kind: "http",
        method: mm ? mm[1].toUpperCase() : "GET",
        target: url,
      });
    }
    for (const m of line.matchAll(/\b([a-zA-Z0-9_]+Action)\s*\(/g)) {
      if (
        !line.trim().startsWith("export ") &&
        !line.trim().startsWith("async function") &&
        (!serverActionNames || serverActionNames.has(m[1]))
      ) {
        calls.push({
          file: fileRel,
          line: lineNo,
          kind: "serverAction",
          method: "POST",
          target: m[1],
        });
      }
    }
  });
  return calls;
}

const APPS = ["admin", "it", "store", "web"];
const manifest = {
  generatedAt: new Date().toISOString(),
  apps: {},
  backend: {
    services: {},
    routes: [],
    tables: [],
  },
};

for (const appName of APPS) {
  const appRoot = path.join(root, "apps", appName);
  const appDir = path.join(appRoot, "app");
  const compDir = path.join(appRoot, "components");
  const libDir = path.join(appRoot, "lib");

  const allAppFiles = walk(appDir).filter((f) => /\.(ts|tsx)$/.test(f));
  const compFiles = walk(compDir).filter((f) => /\.(ts|tsx)$/.test(f));
  const libFiles = walk(libDir).filter((f) => /\.(ts|tsx)$/.test(f));

  const serverActions = [];
  for (const f of [...allAppFiles, ...compFiles, ...libFiles]) {
    const src = fs.readFileSync(f, "utf8");
    if (src.includes('"use server"') || src.includes("'use server'")) {
      const fns = [...src.matchAll(/export\s+async\s+function\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
      serverActions.push({ file: rel(f), functions: fns });
    }
  }
  const serverActionNames = new Set(serverActions.flatMap((s) => s.functions));

  const pages = allAppFiles
    .filter((f) => path.basename(f) === "page.tsx")
    .map((f) => ({
      file: rel(f),
      route: toNextRoute(appDir, f, "page.tsx"),
      calls: extractApiAndActionCalls(fs.readFileSync(f, "utf8"), rel(f), serverActionNames),
    }));

  const apiRoutes = allAppFiles
    .filter((f) => path.basename(f) === "route.ts")
    .map((f) => {
      const src = fs.readFileSync(f, "utf8");
      const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"].filter((m) =>
        new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\b`).test(src),
      );
      return {
        file: rel(f),
        route: toNextRoute(appDir, f, "route.ts"),
        methods,
      };
    });

  // Index imports across pages and components to trace component -> pages
  const importersMap = new Map();
  for (const f of [...allAppFiles, ...compFiles]) {
    const src = fs.readFileSync(f, "utf8");
    const fRel = rel(f);
    for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
      const base = spec.startsWith("@/")
        ? path.join(appRoot, spec.slice(2))
        : path.resolve(path.dirname(f), spec);
      for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
        const candidate = base + ext;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          const cRel = rel(candidate);
          if (!importersMap.has(cRel)) importersMap.set(cRel, []);
          importersMap.get(cRel).push(fRel);
          break;
        }
      }
    }
  }

  const components = compFiles.map((f) => {
    const src = fs.readFileSync(f, "utf8");
    const fRel = rel(f);
    const relFromComp = path.relative(compDir, f).split(path.sep).join("/");
    return {
      file: fRel,
      relativePath: relFromComp,
      isClient: src.includes('"use client"') || src.includes("'use client'"),
      exports: extractTsExports(src),
      calls: extractApiAndActionCalls(src, fRel, serverActionNames),
      importedBy: importersMap.get(fRel) || [],
    };
  });

  manifest.apps[appName] = {
    counts: {
      pages: pages.length,
      apiRoutes: apiRoutes.length,
      apiHandlers: apiRoutes.reduce((acc, r) => acc + r.methods.length, 0),
      serverActionFiles: serverActions.length,
      serverActions: serverActions.reduce((acc, s) => acc + s.functions.length, 0),
      componentFiles: components.length,
      clientComponents: components.filter((c) => c.isClient).length,
      componentExports: components.reduce((acc, c) => acc + c.exports.length, 0),
    },
    pages,
    apiRoutes,
    serverActions,
    components,
  };
}

// Parse Go microservices
const servicesDir = path.join(root, "backend", "services");
const serviceDirs = fs
  .readdirSync(servicesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const TABLE_PREFIX_FALLBACK = {
  identity: "/v1/identity/admin",
  system: "/v1/system",
  hr: "/v1/hr",
  itsm: "/v1/itsm/requests",
  finance: "/v1/finance",
  sales: "/v1/sales",
  commerce: "/v1/commerce",
  workflow: "/v1/workflow",
  inventory: "/v1/inventory",
  cms: "/v1/cms",
  notify: "/v1/notify",
  delivery: "/v1/delivery",
};

for (const svc of serviceDirs) {
  const goFiles = walk(path.join(servicesDir, svc)).filter((f) => f.endsWith(".go") && !f.endsWith("_test.go"));
  const varPrefixes = new Map();
  const svcRoutes = [];
  const svcTables = [];

  // First pass: resolve group variable -> prefix per file (fallback to cross-file only when passed in helper)
  const globalPrefixes = new Map();
  for (const gf of goFiles) {
    const src = fs.readFileSync(gf, "utf8");
    for (const m of src.matchAll(/\b([A-Za-z_]\w*)\s*:?=\s*([A-Za-z_]\w*)\.Group\(\s*"([^"]+)"/g)) {
      const [, varName, parentVar, pfx] = m;
      const parentPrefix = parentVar === "e" ? "" : globalPrefixes.get(parentVar) || "";
      globalPrefixes.set(varName, `${parentPrefix}${pfx}`.replace(/\/+/g, "/"));
    }
    if (svc === "files" && src.includes("httpapi.Register(e.Group(")) {
      globalPrefixes.set("e", "/v1/files");
    }
  }

  for (const gf of goFiles) {
    const src = fs.readFileSync(gf, "utf8");
    const gfRel = rel(gf);
    const localPrefixes = new Map(globalPrefixes);
    for (const m of src.matchAll(/\b([A-Za-z_]\w*)\s*:?=\s*([A-Za-z_]\w*)\.Group\(\s*"([^"]+)"/g)) {
      const [, varName, parentVar, pfx] = m;
      const parentPrefix = parentVar === "e" ? "" : localPrefixes.get(parentVar) || "";
      localPrefixes.set(varName, `${parentPrefix}${pfx}`.replace(/\/+/g, "/"));
    }
    for (const m of src.matchAll(/\b([A-Za-z_]\w*)\.(GET|POST|PUT|PATCH|DELETE)\(\s*"([^"]*)"/g)) {
      const [, targetVar, method, subPath] = m;
      let prefix = localPrefixes.get(targetVar) || "";
      if (!prefix && targetVar === "g" && svc === "files") prefix = "/v1/files";
      if (!prefix && subPath.startsWith("/v1/")) prefix = "";
      else if (!prefix && targetVar !== "e") prefix = TABLE_PREFIX_FALLBACK[svc] || `/v1/${svc}`;
      const fullPath = `${prefix}${subPath}`.replace(/\/+/g, "/");
      svcRoutes.push({ service: svc, method, path: fullPath, file: gfRel });
    }
    for (const m of src.matchAll(/RegisterTableRoutes\(\s*([A-Za-z_]\w*)\s*,[\s\S]*?,\s*"([^"]+)"\s*,\s*\[\]string\{([\s\S]*?)\}/g)) {
      const [, groupVar, schema, block] = m;
      const prefix = localPrefixes.get(groupVar) || TABLE_PREFIX_FALLBACK[schema] || `/v1/${schema}`;
      for (const tm of block.matchAll(/"([^"]+)"/g)) {
        svcTables.push({
          service: svc,
          schema,
          prefix,
          table: tm[1],
          endpoint: `${prefix}/tables/${tm[1]}`,
          file: gfRel,
        });
      }
    }
  }

  manifest.backend.services[svc] = {
    routeCount: svcRoutes.length,
    tableCount: svcTables.length,
  };
  manifest.backend.routes.push(...svcRoutes);
  manifest.backend.tables.push(...svcTables);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

console.log(`Generated ${rel(outPath)}`);
for (const appName of APPS) {
  console.log(`  app:${appName.padEnd(6)}`, manifest.apps[appName].counts);
}
console.log(
  `  backend: routes=${manifest.backend.routes.length}, jsoncrud tables=${manifest.backend.tables.length} (${manifest.backend.tables.length * 3} CRUD ops)`,
);
