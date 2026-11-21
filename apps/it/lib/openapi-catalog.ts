import fs from "node:fs";
import path from "node:path";

export type OpenApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface OpenApiEndpoint {
  method: OpenApiMethod;
  path: string;
  service: string;
  summary: string;
  description: string;
  operationId: string;
  tags: string[];
}

const HTTP_METHODS = new Set<string>(["get", "post", "put", "patch", "delete"]);

let cached: { mtimeMs: number; filePath: string; items: OpenApiEndpoint[] } | null = null;

function resolveRepoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "docs", "api", "combined-openapi.yaml"))) {
      return dir;
    }
  }
  return path.resolve(process.cwd(), "../..");
}

function unquoteYaml(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function inferService(endpointPath: string, tags: string[]): string {
  const match = endpointPath.match(/^\/v1\/([a-z0-9_-]+)/i);
  if (match?.[1]) return match[1].toLowerCase();
  if (tags.length > 0) return tags[0].toLowerCase();
  return "gateway";
}

export function parseOpenApiPathsYaml(yamlText: string): OpenApiEndpoint[] {
  const lines = yamlText.split(/\r?\n/);
  const endpoints: OpenApiEndpoint[] = [];

  let inPaths = false;
  let currentPath: string | null = null;
  let current: OpenApiEndpoint | null = null;
  let inTags = false;

  const flush = () => {
    if (!current) return;
    current.service = inferService(current.path, current.tags);
    endpoints.push(current);
    current = null;
    inTags = false;
  };

  for (const line of lines) {
    if (!inPaths) {
      if (/^paths:\s*$/.test(line)) {
        inPaths = true;
      }
      continue;
    }

    // End of top-level `paths:` block when another root key starts at column 0
    if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("#")) {
      flush();
      break;
    }

    // Path entry at 2-space indent: `  /v1/foo/bar:`
    const pathMatch = line.match(/^  (\/[^:]+|["']\/[^"']+["']):\s*$/);
    if (pathMatch) {
      flush();
      currentPath = unquoteYaml(pathMatch[1]);
      continue;
    }

    // Method entry at 4-space indent: `    get:`
    const methodMatch = line.match(/^    ([a-z]+):\s*$/);
    if (methodMatch && currentPath) {
      const m = methodMatch[1].toLowerCase();
      if (HTTP_METHODS.has(m)) {
        flush();
        current = {
          method: m.toUpperCase() as OpenApiMethod,
          path: currentPath,
          service: "gateway",
          summary: "",
          description: "",
          operationId: "",
          tags: [],
        };
      } else {
        flush();
      }
      continue;
    }

    if (!current) continue;

    // 6-space operation property
    const propMatch = line.match(/^      ([a-zA-Z0-9_-]+):(.*)$/);
    if (propMatch) {
      const key = propMatch[1];
      const val = unquoteYaml(propMatch[2]);
      inTags = key === "tags";
      if (key === "summary" && val) {
        current.summary = val;
      } else if (key === "description" && val && !val.startsWith("|") && !val.startsWith(">")) {
        current.description = val;
      } else if (key === "operationId" && val) {
        current.operationId = val;
      }
      continue;
    }

    if (inTags) {
      const tagMatch = line.match(/^        -\s+(.+)$/);
      if (tagMatch) {
        current.tags.push(unquoteYaml(tagMatch[1]));
      }
    }
  }

  flush();
  return endpoints;
}

export function loadOpenApiEndpoints(): OpenApiEndpoint[] {
  const filePath = path.join(resolveRepoRoot(), "docs", "api", "combined-openapi.yaml");
  try {
    const stat = fs.statSync(filePath);
    if (cached && cached.filePath === filePath && cached.mtimeMs === stat.mtimeMs) {
      return cached.items;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const items = parseOpenApiPathsYaml(raw);
    cached = { mtimeMs: stat.mtimeMs, filePath, items };
    return items;
  } catch {
    return [];
  }
}
