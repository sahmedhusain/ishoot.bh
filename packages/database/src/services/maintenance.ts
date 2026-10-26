import { serverMessages } from "@platform/locales";
import { db } from "../db";
import {
  getStorageClient,
  isSupabaseStorageConfigured,
  uploadStorageLocation,
} from "./storage";
import { uploadRoot } from "./uploads";
import path from "node:path";
import fs from "node:fs/promises";

export async function removeExpiredUploads() {
  return db.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string; fileUrl: string }[]
      >`SELECT id,"fileUrl" FROM "UploadObject" WHERE "claimedAt" IS NULL AND "isPublic"=false AND "expiresAt"<CURRENT_TIMESTAMP ORDER BY "expiresAt" LIMIT 25 FOR UPDATE SKIP LOCKED`;
      const locations = rows.map((row) =>
        uploadStorageLocation(row.fileUrl, false),
      );
      if (rows.length && isSupabaseStorageConfigured()) {
        const { error } = await getStorageClient()
          .storage.from("private-assets")
          .remove(locations.map((location) => location.path));
        if (error)
          throw new Error(
            serverMessages.expiredUploadRemovalFailedDatabaseRecordsRetained,
          );
      } else {
        for (const location of locations) {
          const root = path.resolve(uploadRoot());
          try {
            const canonicalRoot = await fs.realpath(root);
            const canonicalFile = await fs.realpath(
              path.join(root, location.path),
            );
            if (!canonicalFile.startsWith(canonicalRoot + path.sep))
              throw new Error(serverMessages.uploadEscapedStorageRoot);
            await fs.unlink(canonicalFile);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
        }
      }
      if (rows.length)
        await tx.uploadObject.deleteMany({
          where: { id: { in: rows.map((row) => row.id) } },
        });
      return rows.length;
    },
    { timeout: 15000 },
  );
}
