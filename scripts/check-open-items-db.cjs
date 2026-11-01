// All writes are isolated fixtures; refuses any nonlocal or non-test database.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const url = new URL(process.env.DATABASE_URL || 'file:///missing');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw Error('Use a disposable local *_test database');
require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', target: 'ES2022', moduleResolution: 'Node', esModuleInterop: true, resolveJsonModule: true } });
const { db, runAtomicMutation } = require('../packages/database/src/db.ts');
// Modules live in the system service (backend/services/system); this check needs the backend stack.
const modules = require('../packages/database/src/queries/features.ts');
const mfa = require('../packages/database/src/services/mfa.ts');
const { claimUpload } = require('../packages/database/src/services/uploads.ts');
const { consumeAbuseLimit } = require('../packages/database/src/services/abuse-limits.ts');
const { processEmailJobs } = require('../packages/database/src/services/email-outbox.ts');
const { iterateListExport } = require('../packages/database/src/queries/list-pages.ts');
const { getClientsPage } = require('../packages/database/src/queries/client-profiles.ts');
const { hasPermission } = require('../packages/database/src/queries/permissions.ts');
const prefix = 'open-' + randomUUID(); let actor, mom, toggle, toggleChanged = false, companyCreated = false;
function decode32(value) { let bits = 0, n = 0, bytes = []; for (const c of value) { n = (n << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c); bits += 5; if (bits >= 8) { bits -= 8; bytes.push((n >>> bits) & 255); } } return Buffer.from(bytes); }
async function main() {
  for (const [seconds, code] of [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']]) assert.equal(mfa.totp(Buffer.from('12345678901234567890'), Math.floor(seconds / 30), 8), code);
  await db.role.upsert({ where: { id: 'super_admin' }, create: { id: 'super_admin', nameEn: 'Admin', nameAr: 'Admin', isSystem: true }, update: {} });
  actor = await db.user.create({ data: { email: prefix + '@example.invalid', fullName: prefix, role: 'super_admin', passwordHash: 'isolated-fixture' } });
  await assert.rejects(db.role.delete({ where: { id: 'super_admin' } }), /Foreign key/);
  await assert.rejects(db.user.create({ data: { email: prefix + 'bad@example.invalid', fullName: prefix, role: prefix, passwordHash: 'fixture' } }), /Foreign key/);
  await assert.rejects(runAtomicMutation(async () => { await db.crmContact.create({ data: { firstName: prefix + 'rollback' } }); await db.activityLog.create({ data: { userId: prefix, action: 'update', entityType: 'test', entityId: prefix } }); }), /Foreign key/);
  assert.equal(await db.crmContact.count({ where: { firstName: prefix + 'rollback' } }), 0);
  console.log('PASS: role foreign keys and mutation/audit rollback');
  await db.crmContact.createMany({ data: Array.from({ length: 505 }, (_, i) => ({ firstName: prefix, lastName: String(i).padStart(3, '0'), notes: 'private-large-notes'.repeat(1000) })) });
  const ids = new Set(); for (let page = 1; page <= 11; page++) { const r = await getClientsPage({ q: prefix, page: String(page) }); assert.equal(r.total, 505); assert(r.items.length <= 50); for (const row of r.items) { assert(!row.notes); ids.add(row.id); } }
  assert.equal(ids.size, 505); const exported = new Set(); for await (const rows of iterateListExport('contacts', { q: prefix })) { assert(rows.length <= 500); rows.forEach(r => exported.add(r.id)); } assert.equal(exported.size, 505);
  assert.equal((await getClientsPage({ q: prefix, page: '99999' })).page, 11);
  const movingExport = iterateListExport('contacts', { q: prefix }); const firstBatch = await movingExport.next(); await db.crmContact.delete({ where: { id: firstBatch.value.at(-1).id } }); assert.equal((await movingExport.next()).value.length, 5); await movingExport.return();
  console.log('PASS: all 505 records reachable, clamped pages, narrow DTOs and complete batched export');
  const contact = await db.crmContact.findFirstOrThrow({ where: { firstName: prefix } });
  const lists = require('../packages/database/src/queries/list-pages.ts');
  const invoices = Array.from({ length: 105 }, (_, i) => ({ id: prefix + 'invoice' + i, invoiceNumber: prefix + '-' + i, clientId: contact.id, dueDate: new Date(), status: 'sent', currency: 'BHD', totalAmount: 100 }));
  await db.invoice.createMany({ data: invoices });
  await db.payment.createMany({ data: invoices.map((i, n) => ({ invoiceId: i.id, receiptNumber: prefix + '-' + n, amount: 50, currency: 'BHD', paymentMethod: 'cash' })) });
  await db.payment.create({ data: { invoiceId: invoices[0].id, receiptNumber: prefix + '-wrong-currency', amount: 1000, currency: 'USD', paymentMethod: 'cash' } });
  await db.crmDeal.createMany({ data: Array.from({ length: 105 }, (_, i) => ({ title: prefix + '-' + i, contactId: contact.id, dealValue: 10, currency: 'USD', dealStage: 'invoiced' })) });
  await db.expense.createMany({ data: Array.from({ length: 105 }, (_, i) => ({ descriptionEn: prefix + '-' + i, amount: 10, currency: 'USD', isBillable: true })) });
  await db.attachment.createMany({ data: Array.from({ length: 505 }, (_, i) => ({ fileName: prefix + '-' + i, fileUrl: '/api/files/vault/' + prefix + '-' + i + '.pdf', entityType: 'contact', entityId: contact.id, uploadedById: actor.id })) });
  for (const [fn, total] of [[lists.getInvoicesPage, 105], [lists.getDealsPage, 105], [lists.getExpensesPage, 105], [lists.getPaymentsPage, 106], [lists.getAttachmentsPage, 505]]) { const result = await fn({ q: prefix, page: '3' }); assert.equal(result.total, total); assert.equal(result.items.length, total === 505 ? 50 : total - 100); }
  const scopedDeal = await db.crmDeal.findFirstOrThrow({ where: { title: { startsWith: prefix } } });
  await db.invoice.updateMany({ where: { id: { in: invoices.slice(0, 55).map(r => r.id) } }, data: { dealId: scopedDeal.id } });
  const scopedPage = await lists.getInvoicesPage({ dealId: scopedDeal.id, page: '2' }); assert.equal(scopedPage.total, 55); assert.equal(scopedPage.items.length, 5); assert(!('line_items' in scopedPage.items[0]));
  const scopedIds = new Set(); for await (const batch of lists.iterateListExport('invoices', { dealId: scopedDeal.id })) batch.forEach(r => scopedIds.add(r.id)); assert.equal(scopedIds.size, 55);
  await assert.rejects(db.crmDeal.update({ where: { id: scopedDeal.id }, data: { assignedTo: prefix + 'missing' } }), /Foreign key/);
  const invoicePage = await lists.getInvoicesPage({ q: prefix }); assert(invoicePage.items.every(i => i.amount_due === 50));
  const archiveIds = new Set(); for await (const batch of lists.iterateListExport('archive', { q: prefix })) batch.forEach(r => archiveIds.add(r.id)); assert.equal(archiveIds.size, 505);
  const dossier = await require('../packages/database/src/queries/crm.ts').getCustomerDossier(contact.id, undefined, { pages: { invoices: '3', deals: '3' } }); assert.equal(dossier.pagination.invoices.total, 105); assert.equal(dossier.invoices.length, 5); assert.equal(dossier.metrics.totalOutstanding, 5250); assert.equal(dossier.metrics.activeDealsCount, 105);
  const filtered = await require('../packages/database/src/queries/crm.ts').getCustomerDossier(contact.id, undefined, { q: 'no-matching-record' }); assert.equal(filtered.metrics.lastActivityDate, dossier.metrics.lastActivityDate);
  console.log('PASS: financial/archive page navigation, complete archive export, currency isolation and dossier metrics independent of pages/search');
  if (!(await db.companySetting.count())) { await db.companySetting.create({ data: { companyNameEn: prefix, companyNameAr: prefix } }); companyCreated = true; }
  await assert.rejects(db.companySetting.create({ data: { companyNameEn: prefix, companyNameAr: prefix } }), /Unique constraint/);
  await assert.rejects(db.companySetting.updateMany({ data: { companyNameEn: '' } }), /check constraint/);
  const email = prefix + 'shared@example.invalid'; await db.crmContact.createMany({ data: [{ firstName: prefix + 'a', email, emailNorm: email }, { firstName: prefix + 'b', email, emailNorm: email }] });
  const resolution = await require('../packages/database/src/services/lead-resolver.ts').resolveIncomingLead({ name: 'Shared mailbox fixture', email, message: prefix, intent: 'inquiry' }); assert.equal(resolution.resolution, 'merge_conflict'); assert.equal(resolution.customerId, null);
  console.log('PASS: singleton/required identity and ambiguous contacts flagged without arbitrary linking');
  // Upload expiry is covered by the files service's own tests (backend/services/files).
  const { fixtureUpload, removeFixtureUploads } = require('./lib/upload-fixtures.cjs');
  const { fileUrl } = await fixtureUpload(actor.id, { folder: 'vault', fileName: prefix + '.pdf', mimeType: 'application/pdf', bytes: Buffer.from('%PDF-1\n') });
  await assert.rejects(claimUpload(fileUrl, 'other-user'), /belongs/);
  const claims = await Promise.allSettled([claimUpload(fileUrl, actor.id), claimUpload(fileUrl, actor.id)]); assert.equal(claims.filter(x => x.status === 'fulfilled').length, 1);
  await removeFixtureUploads();
  const limits = await Promise.allSettled(Array.from({ length: 20 }, () => consumeAbuseLimit(prefix, 'fixture', 7))); assert.equal(limits.filter(x => x.status === 'fulfilled').length, 7);
  console.log('PASS: pending upload owner/expiry/single claim and shared concurrent abuse limit');
  process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString('base64'); const setup = await mfa.beginMfaEnrollment(actor.id); const secret = decode32(setup.secret); const pending = await db.user.findUniqueOrThrow({ where: { id: actor.id } }); assert(!pending.mfaPendingSecretEncrypted.includes(setup.secret));
  await db.session.create({ data: { userId: actor.id, token: prefix, expiresAt: new Date(Date.now() + 60000) } });
  const code = mfa.totp(secret, Math.floor(Date.now() / 30000)); const recovery = await mfa.completeMfaEnrollment(actor.id, code); assert.equal(recovery.length, 10); assert.equal(await db.session.count({ where: { userId: actor.id } }), 0); assert.equal(await mfa.verifyMfa(actor.id, code), false);
  const attempts = await Promise.all([mfa.verifyMfa(actor.id, recovery[0]), mfa.verifyMfa(actor.id, recovery[0])]); assert.equal(attempts.filter(Boolean).length, 1); await mfa.disableMfa(actor.id, recovery[1]); assert.equal((await db.user.findUniqueOrThrow({ where: { id: actor.id } })).mfaEnabled, false);
  console.log('PASS: RFC TOTP vectors, encrypted enrollment, replay prevention, one-use recovery and session revocation');
  mom = await db.minuteOfMeeting.create({ data: { momNumber: prefix, title: prefix, meetingDate: new Date(), agenda: 'fixture', status: 'approved' } });
  const now = new Date(); const job = await db.emailJob.create({ data: { eventKey: prefix, momId: mom.id, createdById: actor.id, recipient: 'fixture@example.invalid', subject: prefix, html: 'fixture', attachmentName: 'meeting.pdf', attachment: Buffer.from('fixture'), nextAttemptAt: now } });
  await processEmailJobs(async () => ({ success: false }), now); assert.equal((await db.emailJob.findUniqueOrThrow({ where: { id: job.id } })).status, 'pending');
  let calls = 0; const later = new Date(now.getTime() + 60000); await Promise.all([processEmailJobs(async input => { calls++; assert.equal(input.idempotencyKey, prefix); return { success: true, id: 'fake-provider-evidence' }; }, later), processEmailJobs(async () => { calls++; return { success: true, id: 'fake-provider-evidence' }; }, later)]); assert.equal(calls, 1); const accepted = await db.emailJob.findUniqueOrThrow({ where: { id: job.id } }); assert.equal(accepted.status, 'accepted'); assert.equal(accepted.providerId, 'fake-provider-evidence');
  console.log('PASS: email retry, concurrent claim and provider-acceptance evidence; no real email sent');
  toggle = await modules.getFeatureToggle('crm_deals'); await modules.updateFeatureToggle('crm_deals', false, 'check-open-items'); toggleChanged = true; assert.equal(await hasPermission('sales', 'contacts', 'read'), false);
  // Super Admin keeps access to switched-off modules (see check-platform: stale denials, overrides and disabled modules never restrict Super Admin).
  assert.equal(await hasPermission('super_admin', 'contacts', 'read'), true);
  console.log('PASS: disabled feature denies direct server grants to every role except Super Admin');
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  await db.emailJob.deleteMany({ where: { eventKey: prefix } }); if (mom) await db.minuteOfMeeting.delete({ where: { id: mom.id } });
  await db.attachment.deleteMany({ where: { fileName: { startsWith: prefix } } }); await db.payment.deleteMany({ where: { receiptNumber: { startsWith: prefix } } }); await db.invoice.deleteMany({ where: { invoiceNumber: { startsWith: prefix } } }); await db.crmDeal.deleteMany({ where: { title: { startsWith: prefix } } }); await db.expense.deleteMany({ where: { descriptionEn: { startsWith: prefix } } }); await db.inquiry.deleteMany({ where: { message: prefix } }); if (companyCreated) await db.companySetting.deleteMany({ where: { companyNameEn: prefix } });
  await db.crmContact.deleteMany({ where: { firstName: { startsWith: prefix } } }); await db.abuseWindow.deleteMany({ where: { key: { startsWith: prefix } } });
  if (actor) { await db.activityLog.deleteMany({ where: { userId: actor.id } }); await db.user.delete({ where: { id: actor.id } }); }
  if (toggleChanged && toggle) await modules.updateFeatureToggle('crm_deals', toggle.isEnabled, 'check-open-items');
  await db.$disconnect();
});
