import { userClient, unwrap, unwrapEmpty } from "./http";

export type ServiceHealth = {
  name: string;
  status: "healthy" | "unhealthy";
  latencyMs: number;
  version?: string;
  checkedAt: string;
  error?: string;
};

export type RuntimeConfig = {
  environment: string;
  timeZone: string;
  activeLogLevel: string;
  debugToggles: Array<{
    id: string;
    service: string;
    logLevel: string;
    enabledBy: string;
    enabledAt: string;
    expiresAt: string;
  }>;
  lokiUrl?: string;
  tempoUrl?: string;
};

export type DatabaseStats = {
  schemas: Array<{
    schema: string;
    version: number;
    appliedAt: string;
  }>;
  outboxLag: Array<{
    schema: string;
    pending: number;
  }>;
  riverStats: Array<{
    queue: string;
    state: string;
    count: number;
  }>;
};

export type BackupRecord = {
  id: string;
  kind: "database" | "bucket" | "full";
  fileName: string;
  fileSize: number;
  checksum: string;
  status: "completed" | "failed" | "verifying" | "verified";
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  verifiedAt?: string;
  details?: Record<string, unknown>;
};

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  revokedAt?: string;
};

export type ApiKeyCreated = {
  id: string;
  name: string;
  token: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
};

export const getSystemHealthForIT = async (token: string): Promise<ServiceHealth[]> => {
  const res = await unwrap(
    userClient<any>(token).GET("/v1/system/desk/health")
  );
  return res.items;
};

export const getRuntimeConfigForIT = (token: string): Promise<RuntimeConfig> =>
  unwrap(userClient<any>(token).GET("/v1/system/desk/config"));

export const setDebugToggleForIT = (
  token: string,
  service: string,
  logLevel: string,
  ttlMinutes: number
) =>
  unwrapEmpty(
    userClient<any>(token).PUT("/v1/system/desk/config/debug-toggle", {
      body: { service, logLevel, ttlMinutes },
    })
  );

export const removeDebugToggleForIT = (token: string, service: string) =>
  unwrapEmpty(
    userClient<any>(token).DELETE(
      "/v1/system/desk/config/debug-toggle/{service}",
      {
        params: { path: { service } },
      }
    )
  );

export const getDatabaseStatsForIT = (token: string): Promise<DatabaseStats> =>
  unwrap(userClient<any>(token).GET("/v1/system/desk/database"));

export const listBackupsForIT = async (token: string): Promise<BackupRecord[]> => {
  const res = await unwrap(
    userClient<any>(token).GET("/v1/system/desk/backups")
  );
  return res.items;
};

export const createBackupForIT = (
  token: string,
  kind: "database" | "bucket" | "full"
): Promise<BackupRecord> =>
  unwrap(
    userClient<any>(token).POST("/v1/system/desk/backups", {
      body: { kind },
    })
  );

export const verifyBackupForIT = (token: string, id: string) =>
  unwrapEmpty(
    userClient<any>(token).POST("/v1/system/desk/backups/{id}/verify", {
      params: { path: { id } },
    })
  );

export const listAPIKeysForIT = async (token: string): Promise<ApiKeyRecord[]> => {
  const res = await unwrap(
    userClient<any>(token).GET("/v1/system/desk/api-keys")
  );
  return res.items;
};

export const createAPIKeyForIT = (
  token: string,
  name: string,
  scopes: string[],
  rateLimit: number = 60,
  expiresAt?: string
): Promise<ApiKeyCreated> =>
  unwrap(
    userClient<any>(token).POST("/v1/system/desk/api-keys", {
      body: { name, scopes, rateLimit, expiresAt },
    })
  );

export const revokeAPIKeyForIT = (token: string, id: string) =>
  unwrapEmpty(
    userClient<any>(token).DELETE("/v1/system/desk/api-keys/{id}", {
      params: { path: { id } },
    })
  );
