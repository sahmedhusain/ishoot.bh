// Run: node scripts/repair-demo-files.cjs
// Writes the sample files that seeded demo records point at (claim receipts named seed_*), into whichever
// storage is active. Real user uploads are never touched: a missing real file stays missing so it is noticed.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true } });
const fs = require("node:fs");
const { db } = require("../packages/database/src/db.ts");
const { storeFileBytes, uploadRoot } = require("../packages/database/src/services/uploads.ts");
const { isSupabaseStorageConfigured, localUploadPath } = require("../packages/database/src/services/storage.ts");
const { SAMPLE_RECEIPT_JPEG, samplePdf } = require("../packages/database/src/services/sample-files.ts");

async function main() {
  const demo = await db.uploadObject.findMany({ where: { fileUrl: { contains: "/seed_" } } });
  let written = 0;
  for (const upload of demo) {
    const bytes = upload.mimeType === "image/jpeg" ? SAMPLE_RECEIPT_JPEG : upload.mimeType === "application/pdf" ? samplePdf(upload.fileName) : null;
    if (!bytes) continue;
    if (!isSupabaseStorageConfigured() && fs.existsSync(localUploadPath(upload.fileUrl, uploadRoot()))) continue;
    await storeFileBytes(upload.fileUrl, bytes, upload.mimeType, upload.isPublic);
    // Keep the recorded size truthful so verification and downloads agree.
    await db.uploadObject.update({ where: { fileUrl: upload.fileUrl }, data: { fileSize: bytes.length } });
    await db.attachment.updateMany({ where: { fileUrl: upload.fileUrl }, data: { fileSize: bytes.length } });
    written++;
  }
  console.log(`Demo files: ${written} written, ${demo.length - written} already present (${isSupabaseStorageConfigured() ? "Supabase Storage" : uploadRoot()}).`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
