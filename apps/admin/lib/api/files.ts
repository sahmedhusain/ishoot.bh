import type { components, paths } from "./generated/files";
import { apiError } from "./errors";
import { serviceClient, unwrap } from "./http";
import { buildQuery, serviceFetch } from "./service-fetch";

export type FileRecord = components["schemas"]["File"];

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const files = () => (client ??= serviceClient<paths>());

export const registerUpload = (body: components["schemas"]["RegisterUpload"]) =>
  unwrap(files().POST("/v1/files/uploads", { body }));

export const writeUpload = (
  fileUrl: string,
  ownerId: string,
  bytes: BodyInit,
  size: number,
) =>
  unwrap(
    files().PUT("/v1/files/uploads/content", {
      params: { query: { fileUrl, ownerId } },
      body: bytes as unknown as string,
      bodySerializer: (b) => b,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(size),
      },
      ...(isStream(bytes) ? { duplex: "half" } : {}),
    }),
  );

export const importUpload = (body: { ownerId: string; folder: string; url: string }) =>
  unwrap(files().POST("/v1/files/uploads/import", { body }));

export const verifyUpload = (fileUrl: string, ownerId: string) =>
  unwrap(
    files().POST("/v1/files/uploads/verify", { body: { fileUrl, ownerId } }),
  );

export const claimUpload = (
  fileUrl: string,
  ownerId: string,
  options: { requirePrivate?: boolean } = {},
) =>
  unwrap(
    files().POST("/v1/files/uploads/claim", {
      body: { fileUrl, ownerId, requirePrivate: options.requirePrivate },
    }),
  );

export async function lookupFiles(fileUrls: string[]): Promise<FileRecord[]> {
  if (!fileUrls.length) return [];
  const { items } = await unwrap(
    files().GET("/v1/files/records", {
      params: { query: { fileUrl: fileUrls } },
    }),
  );
  return items;
}

export const lookupFile = async (fileUrl: string) =>
  (await lookupFiles([fileUrl]))[0] ?? null;

export async function readFile(fileUrl: string): Promise<Response | null> {
  const { response, error } = await files().GET("/v1/files/content", {
    params: { query: { fileUrl } },
    parseAs: "stream",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw await apiError(response, error);
  return response;
}

export async function readFileBytes(fileUrl: string): Promise<Buffer | null> {
  const response = await readFile(fileUrl);
  return response ? Buffer.from(await response.arrayBuffer()) : null;
}

type StoreTarget = { fileUrl: string } | { folder: string; namePrefix: string };

export async function storeFile(
  target: StoreTarget,
  body: Uint8Array | ReadableStream<Uint8Array>,
  options: {
    ownerId?: string;
    fileName?: string;
    ifExists?: "fail" | "keep";
    size?: number;
  } = {},
): Promise<FileRecord | null> {
  const size = body instanceof Uint8Array ? body.byteLength : options.size;
  if (!size)
    throw new Error("storeFile: the size of a streamed body is required");
  const { data, error, response } = await files().PUT("/v1/files/content", {
    params: {
      query: {
        ...target,
        ownerId: options.ownerId,
        fileName: options.fileName,
      },
    },
    body: body as unknown as string,
    bodySerializer: (b) => b,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(size),
    },
    ...(isStream(body as BodyInit) ? { duplex: "half" } : {}),
  });
  if (response.status === 409 && options.ifExists === "keep") return null;
  if (!response.ok || !data) throw await apiError(response, error);
  return data;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const { response, error } = await files().DELETE("/v1/files/content", {
    params: { query: { fileUrl } },
  });
  if (!response.ok && response.status !== 404)
    throw await apiError(response, error);
}

const isStream = (body: BodyInit) =>
  typeof ReadableStream !== "undefined" && body instanceof ReadableStream;

export type EntityAttachment = {
  id: string;
  fileId?: string | null;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  entityType: string;
  entityId: string;
  documentId?: string | null;
  clientId?: string | null;
  employeeId?: string | null;
  projectId?: string | null;
  uploadedById?: string | null;
  category?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type AttachmentFilters = {
  entityType?: string;
  entityId?: string;
  documentId?: string;
  clientId?: string;
  employeeId?: string;
  projectId?: string;
};

export const listEntityAttachments = async (
  filters?: AttachmentFilters,
  token?: string,
): Promise<EntityAttachment[]> => {
  const res = await serviceFetch<EntityAttachment[] | { items?: EntityAttachment[] }>(
    `/v1/files/attachments${buildQuery(filters)}`,
    {},
    token,
  );
  return Array.isArray(res) ? res : (res?.items ?? []);
};

export const createEntityAttachment = (
  input: Partial<EntityAttachment>,
  token?: string,
): Promise<EntityAttachment> =>
  serviceFetch<EntityAttachment>("/v1/files/attachments", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);

export const deleteEntityAttachment = (id: string, token?: string): Promise<void> =>
  serviceFetch<void>(`/v1/files/attachments/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
