
import files from "../catalog/files.json";

export type FileType = (typeof files.types)[number];
export type FileFolder = (typeof files.folders)[number];

export const FILE_URL_PREFIX = files.urlPrefix;
export const FILE_TYPES: readonly FileType[] = files.types;
export const FILE_FOLDERS: readonly FileFolder[] = files.folders;

export const fileType = (mime: string) =>
  FILE_TYPES.find((t) => t.mime === mime);

export const extensionFor = (mime: string) => fileType(mime)?.extensions[0];

export const fileFolder = (key: string) =>
  FILE_FOLDERS.find((f) => f.key === key);

export function detectFileType(bytes: Uint8Array): string | null {
  const matches = (part: { offset: number; hex: string }) =>
    Buffer.from(part.hex, "hex").every((b, i) => bytes[part.offset + i] === b);
  return (
    FILE_TYPES.find((t) => t.signatures.some((parts) => parts.every(matches)))
      ?.mime ?? null
  );
}
