// The files service (backend/services/files): stored files and the upload protocol.
import type { components, paths } from "./generated/files";
import { apiError } from "./errors";
import { serviceClient, unwrap } from "./http";

export type FileRecord = components["schemas"]["File"];

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const files = () => (client ??= serviceClient<paths>());

/** Reserves an address for a user's upload; the bytes follow with writeUpload. */
export const registerUpload = (body: components["schemas"]["RegisterUpload"]) =>
  unwrap(files().POST("/v1/files/uploads", { body }));

/** Sends the bytes of a reserved upload (exactly the registered size). */
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

/** Checks that an upload is still the owner's and arrived intact. */
export const verifyUpload = (fileUrl: string, ownerId: string) =>
  unwrap(
    files().POST("/v1/files/uploads/verify", { body: { fileUrl, ownerId } }),
  );

/** Verifies an upload and makes it permanent. */
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

/** The records of the given files; missing ones are left out. */
export async function lookupFiles(fileUrls: string[]): Promise<FileRecord[]> {
  if (!fileUrls.length) return [];
  const { items } = await unwrap(
    files().GET("/v1/files/records", {
      params: { query: { fileUrl: fileUrls } },
    }),
  );
  return items;
}

/** One file's record, or null. */
export const lookupFile = async (fileUrl: string) =>
  (await lookupFiles([fileUrl]))[0] ?? null;

/** A stored file's bytes as a streaming response (status 200), or null when there is no such file. */
export async function readFile(fileUrl: string): Promise<Response | null> {
  const { response, error } = await files().GET("/v1/files/content", {
    params: { query: { fileUrl } },
    parseAs: "stream",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw await apiError(response, error);
  return response;
}

/** A stored file's bytes, or null. */
export async function readFileBytes(fileUrl: string): Promise<Buffer | null> {
  const response = await readFile(fileUrl);
  return response ? Buffer.from(await response.arrayBuffer()) : null;
}

type StoreTarget = { fileUrl: string } | { folder: string; namePrefix: string };

/**
 * Stores a file the platform keeps: at a chosen address, or under a generated one in a folder (its type is read
 * from the bytes). With ifExists "keep", an existing file at the address is left as it is (seeds re-run safely).
 */
export async function storeFile(
  target: StoreTarget,
  body: Uint8Array | ReadableStream<Uint8Array>,
  options: {
    ownerId?: string;
    fileName?: string;
    ifExists?: "fail" | "keep";
    /** Required for a streamed body. */
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

/** Deletes a file and its record; a missing file is not an error. */
export async function deleteFile(fileUrl: string): Promise<void> {
  const { response, error } = await files().DELETE("/v1/files/content", {
    params: { query: { fileUrl } },
  });
  if (!response.ok && response.status !== 404)
    throw await apiError(response, error);
}

const isStream = (body: BodyInit) =>
  typeof ReadableStream !== "undefined" && body instanceof ReadableStream;
