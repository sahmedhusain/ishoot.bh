
import type { components, paths } from "./generated/files";
import { apiError } from "./errors";
import { serviceClient, unwrap } from "./http";

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
