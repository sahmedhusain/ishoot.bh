// File types and storage folders (catalog/files.json). The files service applies the same rules in Go.
import files from "../catalog/files.json";

export type FileType = (typeof files.types)[number];
export type FileFolder = (typeof files.folders)[number];

/** Where file addresses start: /api/files/<folder>/<name>. */
export const FILE_URL_PREFIX = files.urlPrefix;
export const FILE_TYPES: readonly FileType[] = files.types;
export const FILE_FOLDERS: readonly FileFolder[] = files.folders;

/** The accepted type with this media type. */
export const fileType = (mime: string) =>
  FILE_TYPES.find((t) => t.mime === mime);

/** The extension new files of this type get. */
export const extensionFor = (mime: string) => fileType(mime)?.extensions[0];

/** The folder with this key. */
export const fileFolder = (key: string) =>
  FILE_FOLDERS.find((f) => f.key === key);

/** Reads the media type from a file's first bytes (so a renamed file cannot pass), or null if not accepted. */
export function detectFileType(bytes: Uint8Array): string | null {
  const matches = (part: { offset: number; hex: string }) =>
    Buffer.from(part.hex, "hex").every((b, i) => bytes[part.offset + i] === b);
  return (
    FILE_TYPES.find((t) => t.signatures.some((parts) => parts.every(matches)))
      ?.mime ?? null
  );
}
