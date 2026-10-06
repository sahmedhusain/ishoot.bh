// Run: node scripts/check-local-uploads.cjs
// Local-disk upload storage (used when Supabase Storage is not configured): type sniffing, write-once,
// path containment and verification against the registered size and type.
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true } });
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const storage = require("../packages/database/src/services/storage.ts");
const { SAMPLE_RECEIPT_JPEG, samplePdf } = require("../packages/database/src/services/sample-files.ts");

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
  try {
    assert.equal(storage.isSupabaseStorageConfigured(), false);
    process.env.SUPABASE_URL = "http://x"; process.env.SUPABASE_SERVICE_ROLE_KEY = "  ";
    assert.equal(storage.isSupabaseStorageConfigured(), false, "a blank key is not configured");
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    assert.equal(storage.detectFileType(SAMPLE_RECEIPT_JPEG), "image/jpeg");
    assert.equal(storage.detectFileType(samplePdf("x")), "application/pdf");
    assert.equal(storage.detectFileType(Buffer.from("89504e470d0a1a0a", "hex")), "image/png");
    assert.equal(storage.detectFileType(Buffer.from("RIFF0000WEBP")), "image/webp");
    assert.equal(storage.detectFileType(Buffer.from("<html>not an image</html>")), null);

    const fileUrl = "/api/files/general/abc_receipt.jpg";
    await storage.writeLocalUpload(fileUrl, root, SAMPLE_RECEIPT_JPEG);
    await assert.rejects(storage.writeLocalUpload(fileUrl, root, SAMPLE_RECEIPT_JPEG), /EEXIST/, "uploads are write-once");
    const upload = { fileUrl, isPublic: false, fileSize: SAMPLE_RECEIPT_JPEG.length, mimeType: "image/jpeg" };
    await storage.verifyStoredUpload(upload, root);
    await assert.rejects(storage.verifyStoredUpload({ ...upload, fileSize: 10 }, root), /does not match/);
    await assert.rejects(storage.verifyStoredUpload({ ...upload, mimeType: "application/pdf" }, root), /does not match/);
    await assert.rejects(storage.verifyStoredUpload(upload), /not configured/, "local verification needs the upload root");
    assert.throws(() => storage.localUploadPath("/api/files/../../etc/passwd.pdf", root), /Invalid upload path/);
    assert.throws(() => storage.localUploadPath("/api/files/secret/a.pdf", root), /Invalid upload path/);
    console.log("Local upload checks passed: blank keys mean local mode, real-type sniffing, write-once files, size/type verification, path containment.");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
