// Test uploads for the check suites. They go through the files service exactly like a user's upload (reserve an
// address, send the bytes as that user), so the code under test claims them the real way. The suites roll their
// database rows back; removeFixtureUploads deletes the files too. Needs the backend stack (API_URL, ADMIN_SERVICE_KEY).
const files = require("../../apps/admin/lib/api/files.ts");

const created = [];

async function fixtureUpload(ownerId, { folder = "general", fileName, mimeType, bytes }) {
  const upload = await files.registerUpload({ ownerId, folder, fileName, mimeType, fileSize: bytes.length });
  await files.writeUpload(upload.fileUrl, ownerId, bytes, bytes.length);
  created.push(upload.fileUrl);
  return upload;
}

async function removeFixtureUploads() {
  await Promise.all(created.splice(0).map((url) => files.deleteFile(url).catch(() => undefined)));
}

module.exports = { fixtureUpload, removeFixtureUploads };
