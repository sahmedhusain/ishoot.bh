import { serverMessages } from "@ishoot/locales";
export interface UploadOptions {
  entityType?: string;
  entityId?: string;
  customName?: string;
  documentType?: string;
}

export async function uploadFileDirectly(file: File, options: UploadOptions = {}) {
  // 1. Init upload
  const initRes = await fetch("/api/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      entityType: options.entityType,
      entityId: options.entityId,
      documentType: options.documentType,
    })
  });
  
  const initData = await initRes.json();
  if (!initRes.ok) throw new Error(initData.error || "Failed to initialize upload");

  // 2. Upload to storage using signed URL
  if (initData.signedUrl) {
    const uploadRes = await fetch(initData.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file
    });
    if (!uploadRes.ok) throw new Error(serverMessages.failedToUploadFileToStorageBucket);
  } else {
    throw new Error(serverMessages.noSignedUrlReturnedFromInit);
  }

  // 3. Finalize upload
  const finalizeRes = await fetch("/api/upload/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileUrl: initData.fileUrl,
      entityType: options.entityType,
      entityId: options.entityId,
      customName: options.customName || file.name,
    })
  });

  const finalizeData = await finalizeRes.json();
  if (!finalizeRes.ok) throw new Error(finalizeData.error || "Failed to finalize upload");

  return finalizeData;
}

/**
 * Uploads a file and leaves it unclaimed so a server action can claim it with the record it belongs to
 * (the action verifies the stored bytes and creates the attachment).
 */
export async function uploadForClaim(file: File, options: Pick<UploadOptions, "entityType" | "entityId"> = {}) {
  const initRes = await fetch("/api/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, entityType: options.entityType, entityId: options.entityId }),
  });
  const initData = await initRes.json();
  if (!initRes.ok || !initData.signedUrl) throw new Error(initData.error || "Failed to initialize upload");
  const uploadRes = await fetch(initData.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!uploadRes.ok) throw new Error(serverMessages.failedToUploadFileToStorageBucket);
  return { fileUrl: initData.fileUrl as string, fileName: file.name };
}
