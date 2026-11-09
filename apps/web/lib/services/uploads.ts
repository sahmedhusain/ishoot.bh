import { readFile, claimUpload, type FileRecord } from "@platform/api-client";
import { serverMessages } from "@platform/locales";

export function isDocumentLink(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 1000 || /\s/.test(value))
    return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !!url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

export async function claimUploadOrLink(fileUrl: string, ownerId?: string) {
  if (isDocumentLink(fileUrl)) {
    if (!ownerId) throw new Error(serverMessages.invalidUploadedFile);
    const url = new URL(fileUrl);
    const name =
      decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "") ||
      url.hostname;
    return {
      fileUrl,
      fileName: name.slice(0, 200),
      fileSize: null,
      mimeType: null,
      isLink: true as const,
    };
  }
  const upload = await claimUpload(fileUrl, ownerId || "");
  return { ...upload, isLink: false as const };
}

export async function fileResponse(
  record: Pick<FileRecord, "fileUrl" | "mimeType" | "fileSize" | "isPublic">,
  options: {
    download?: boolean;
    fileName?: string;
    cacheControl?: string;
  } = {},
): Promise<Response | null> {
  const file = await readFile(record.fileUrl);
  if (!file?.body) return null;
  const disposition = options.download ? "attachment" : "inline";
  return new Response(file.body, {
    headers: {
      "Content-Type": record.mimeType,
      "Content-Length": String(record.fileSize),
      "Cache-Control":
        options.cacheControl ??
        (record.isPublic
          ? "public, max-age=31536000, immutable"
          : "private, no-store"),
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": options.fileName
        ? `${disposition}; filename*=UTF-8''${encodeURIComponent(options.fileName)}`
        : disposition,
    },
  });
}
