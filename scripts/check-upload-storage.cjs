require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', target: 'ES2022', moduleResolution: 'Node', esModuleInterop: true } });
const { realConstants } = require("./lib/real-constants.cjs");
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, mocks) { const module = { exports: {} }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, { module, exports: module.exports, require: id => { id = ((i, m) => i in m ? i : (i.startsWith('@platform/database/') && '@platform/database' in m ? '@platform/database' : i))(id, mocks); if (!(id in mocks)) { if (id.startsWith('node:')) return require(id); const real = realConstants(file, id); if (real) return real; throw Error('Missing mock ' + id); } return mocks[id]; }, process, Buffer, Date, console }); return module.exports; }
// The files service owns storage and its rules (backend/services/files, tested there). This checks the admin side
// of uploads: permission before any claim, pending uploads are only verified, a failed or second claim never creates
// an attachment, and uploaded images reach PDFs.
async function main() {
  const { ApiError, isApiError } = require('../packages/api-client/src/errors.ts');
  const contracts = require('../contracts/src/index.ts');
  let creates = 0, claims = 0, verifies = 0, access = 0, failure = null;
  const upload = { fileUrl: '/api/files/invoices/test.pdf', isPublic: false, fileSize: 123, mimeType: 'application/pdf', ownerId: 'u', fileName: 'test.pdf' };
  const filesApi = {
    isApiError,
    verifyUpload: async () => { verifies++; if (failure) throw failure; return upload; },
    claimUpload: async () => { claims++; if (failure) throw failure; return upload; },
  };
  const response = { json: (body, options) => ({ body, status: options?.status || 200 }) };
  let user = { id: 'u' }, denied = false;
  const tx = { attachment: { create: async () => { creates++; return { id: 'a' } } }, activityLog: { create: async () => { } } };
  const finalize = load('apps/admin/app/api/upload/finalize/route.ts', { 'next/server': { NextResponse: response }, 'next/cache': { revalidatePath() { } }, '../../../../lib/auth': { getCurrentUser: async () => user }, '../../../../lib/attachment-access': { requireAttachmentAccess: async () => { access++; if (denied) throw Error('denied') } }, '@platform/api-client': filesApi, '@platform/database': { measureOperation: async (_, fn) => fn(), db: { $transaction: async fn => fn(tx) } } });
  const request = data => ({ json: async () => data });
  const forInvoice = { fileUrl: upload.fileUrl, entityType: 'invoice', entityId: 'i' };
  user = null; assert.equal((await finalize.POST(request({}))).status, 401); user = { id: 'u' };
  denied = true; assert.equal((await finalize.POST(request(forInvoice))).status, 403); assert.equal(claims + verifies, 0, 'permission comes before the files service'); denied = false;
  failure = new ApiError(422, 'file_content_mismatch'); assert.equal((await finalize.POST(request(forInvoice))).status, 422); assert.equal(creates, 0);
  failure = new ApiError(403, 'upload_not_owned'); assert.equal((await finalize.POST(request(forInvoice))).status, 404); failure = null;
  assert.equal((await finalize.POST(request({ ...forInvoice, entityId: 'pending' }))).status, 200); assert.equal(creates, 0); assert.equal(verifies, 1, 'a pending upload is only verified');
  assert.equal((await finalize.POST(request(forInvoice))).status, 200); assert.equal(creates, 1);
  failure = new ApiError(409, 'upload_unavailable'); assert.equal((await finalize.POST(request(forInvoice))).status, 400); assert.equal(creates, 1, 'a second claim must not create an attachment'); failure = null;

  const adminRequire = require('node:module').createRequire(require.resolve('../apps/admin/package.json'));
  const logo = fs.readFileSync('company/profiles/demo/assets/brand/logo-light.png');
  const { resolveConfiguredPdfAsset } = load('apps/admin/lib/pdf/configured-asset.ts', {
    sharp: adminRequire('sharp'), '@platform/contracts': contracts,
    '@platform/api-client': { readFileBytes: async (url) => (url.endsWith('.png') ? logo : url.endsWith('.pdf') ? Buffer.from('%PDF-1.7') : null) },
  });
  const png = await resolveConfiguredPdfAsset('/api/files/brand/demo-logo.png');
  assert.ok(Buffer.isBuffer(png), 'an uploaded company logo must resolve to image bytes');
  assert.equal(png.subarray(1, 4).toString(), 'PNG', 'PDF branding must use a supported raster format');
  assert.equal(await resolveConfiguredPdfAsset('/api/files/brand/manual.pdf'), undefined, 'only images are drawn into PDFs');
  assert.equal(await resolveConfiguredPdfAsset('/api/files/brand/missing.webp'), undefined);

  const { encryptIntegrationCredentials, decryptIntegrationCredentials } = require('../packages/database/src/services/integration-credentials.ts');
  delete process.env.ENCRYPTION_KEY; assert.throws(() => encryptIntegrationCredentials({ token: 'test' }), /Configure/);
  process.env.ENCRYPTION_KEY = 'a'.repeat(32);
  const sealed = encryptIntegrationCredentials({ token: 'test' }); assert.equal(decryptIntegrationCredentials(sealed).token, 'test'); assert.equal(decryptIntegrationCredentials(sealed + 'ff'), null);
  const { Webhook } = require('svix');
  const { verifyResendWebhook } = require('../apps/admin/lib/resend-webhook.ts');
  const secret = 'whsec_' + Buffer.from('disposable-test-secret').toString('base64'), id = 'evt-test', timestamp = new Date(), payload = JSON.stringify({ type: 'email.delivered', data: { email_id: 'email-test' } });
  process.env.RESEND_WEBHOOK_SECRET = secret;
  const signature = new Webhook(secret).sign(id, timestamp, payload);
  const headers = new Headers({ 'svix-id': id, 'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)), 'svix-signature': signature });
  assert.equal(verifyResendWebhook(payload, headers).id, id);
  assert.throws(() => verifyResendWebhook(payload + ' ', headers), /INVALID_SIGNATURE/);
  assert.throws(() => verifyResendWebhook(payload, new Headers()), /INVALID_SIGNATURE/);
  const old = new Date(Date.now() - 600000); headers.set('svix-timestamp', String(Math.floor(old.getTime() / 1000))); headers.set('svix-signature', new Webhook(secret).sign(id, old, payload)); assert.throws(() => verifyResendWebhook(payload, headers), /INVALID_SIGNATURE/);
  delete process.env.RESEND_WEBHOOK_SECRET; assert.throws(() => verifyResendWebhook(payload, headers), /WEBHOOK_NOT_CONFIGURED/);
  console.log('Upload checks passed: permission before claim, pending uploads verified only, failed or repeated claims create nothing, images reach PDFs; credentials sealing; webhook tampering, missing signature and replay rejection.');
}
main().catch(e => { console.error(e); process.exitCode = 1 });
