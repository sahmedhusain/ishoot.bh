// Run: node scripts/check-assets-db.cjs  (local database only; everything is rolled back)
// Company assets: categories with spec fields and checklists, asset validation, issuing with the employee's
// signature and the approval chain, returns with damage recovered from salary, and the guards in between.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const path = require("node:path");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const assets = require("../packages/database/src/queries/assets.ts");
const { decideApprovalRequest, findPendingApproval } = require("../packages/database/src/services/approval-engine.ts");
const sharp = require(require.resolve("sharp", { paths: [path.resolve(__dirname, "../apps/admin")] }));

const rollback = new Error("ROLLBACK_ASSETS_TEST");
const rejects = (promise, message) => assert.rejects(promise, (error) => error.message === message);
const today = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);

async function signature() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><path d="M20 150 C 120 20, 220 180, 320 60 S 520 160, 580 40" stroke="#111" stroke-width="5" fill="none"/></svg>`;
  return `data:image/png;base64,${(await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64")}`;
}

/** Decides every pending step as Super Admin until the handover approval is final. */
async function approveAll(id, admin, decision = "approved") {
  for (let i = 0; i < 6; i++) {
    const pending = await findPendingApproval("asset_handover", id);
    if (!pending) return;
    await decideApprovalRequest(pending.id, admin.id, decision, "checked");
  }
}

async function main() {
  const sig = await signature();
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const admin = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true, email: { not: "claude-preview@ishoot.test" } } });
      const employee = await tx.employee.findFirstOrThrow({ where: { status: "active", userId: { not: null, notIn: [admin.id] } } });
      const camera = await tx.assetCategory.findUniqueOrThrow({ where: { code: "camera" } });
      assert.ok(Array.isArray(camera.checklist) && camera.checklist.length >= 5, "starter categories with checklists");

      // ---- categories
      await rejects(assets.saveAssetCategory({ name_en: "Rig", name_ar: "", spec_fields: [], checklist: [], is_active: true }), "Enter the category name in English and Arabic");
      await rejects(assets.saveAssetCategory({ name_en: "Rig", name_ar: "منصة", spec_fields: [{ label_en: "Weight", label_ar: "الوزن", type: "colour" }], checklist: [], is_active: true }), "Choose a field type");
      const rig = await assets.saveAssetCategory({
        name_en: "Camera rig", name_ar: "منصة كاميرا",
        spec_fields: [{ label_en: "Weight (kg)", label_ar: "الوزن", type: "number", required: true }, { label_en: "Weight (kg)", label_ar: "الوزن 2", type: "number" }],
        checklist: [{ label_en: "Baseplate", label_ar: "القاعدة" }, { label_en: "Rods", label_ar: "القضبان" }],
        is_active: true,
      });
      assert.equal(rig.code, "camera_rig");
      assert.deepEqual(rig.specFields.map((f) => f.key), ["weight_kg", "weight_kg_2"], "keys stay unique");

      // ---- assets
      await rejects(assets.saveAsset({ category_id: rig.id, name: "Rig A", condition: "good", specs: {} }, admin.id), "Fill in every required detail of the asset");
      await rejects(assets.saveAsset({ category_id: rig.id, name: "Rig A", condition: "good", specs: { weight_kg: "heavy" } }, admin.id), "Enter numbers in number fields");
      const asset = await assets.saveAsset({ category_id: rig.id, name: "Rig A", brand: "Tilta", serial_number: "TL-1", purchase_cost: 450, condition: "new", specs: { weight_kg: "3.2", ghost: "x" } }, admin.id);
      assert.match(asset.assetTag, /^AST-\d{4}-\d+$/);
      assert.deepEqual(asset.specs, { weight_kg: "3.2" }, "only the category's fields are kept");
      await rejects(assets.saveAsset({ category_id: rig.id, name: "Rig B", serial_number: "TL-1", condition: "new", specs: { weight_kg: "1" } }, admin.id), "Another asset in this category has the same serial number");
      await rejects(assets.saveAsset({ category_id: rig.id, name: "Rig A", condition: "new", status: "assigned", specs: { weight_kg: "3" } }, admin.id, asset.id), "Issue and return assets through a handover");

      // ---- issue: waits for the employee, who alone can sign; then approvals assign the asset
      await rejects(assets.startAssetHandover({ asset_id: asset.id, employee_id: employee.id, kind: "return", handover_date: today(), condition: "new", checklist: [] }, admin.id), "This employee does not hold this asset");
      const issue = await assets.startAssetHandover({
        asset_id: asset.id, employee_id: employee.id, kind: "issue", handover_date: today(), condition: "new",
        checklist: [{ key: "baseplate", ok: true }, { key: "rods", ok: false, note: "one rod scratched" }, { key: "made_up", ok: true }],
        accessories: "Case",
      }, admin.id);
      assert.equal(issue.status, "awaiting_employee");
      assert.deepEqual(issue.checklist.map((c) => [c.key, c.ok]), [["baseplate", true], ["rods", false]], "only the category's checklist items");
      assert.ok(await tx.notification.count({ where: { userId: employee.userId, entityId: issue.id } }), "the employee is asked to sign");
      await rejects(assets.startAssetHandover({ asset_id: asset.id, employee_id: employee.id, kind: "issue", handover_date: today(), condition: "new", checklist: [] }, admin.id), "This asset already has a handover in progress");
      await rejects(assets.signAssetHandover(issue.id, { signature: sig, signer_name: "X" }, admin.id, false), "Only the employee can sign this handover");
      await rejects(assets.signAssetHandover(issue.id, { signature: "data:image/png;base64,AAAA", signer_name: "X" }, employee.userId, false), "Draw your signature to continue");
      const signed = await assets.signAssetHandover(issue.id, { signature: sig, signer_name: "Employee Name" }, employee.userId, false);
      assert.equal(signed.status, "pending_approval");
      assert.equal((await tx.asset.findUniqueOrThrow({ where: { id: asset.id } })).status, "available", "nothing changes hands before approval");
      await approveAll(issue.id, admin);
      const issued = await tx.asset.findUniqueOrThrow({ where: { id: asset.id } });
      assert.deepEqual([issued.status, issued.holderEmployeeId], ["assigned", employee.id]);
      assert.equal((await tx.assetHandover.findUniqueOrThrow({ where: { id: issue.id } })).status, "completed");
      const detail = await assets.getAssetHandover(issue.id);
      assert.ok(detail.approval.decisions.length >= 1 && detail.approval.decisions.every((d) => d.decision === "approved"));
      const held = await assets.getEmployeeAssets(employee.id);
      assert.ok(held.held.some((a) => a.id === asset.id));

      // ---- return in person with damage recovered from the next salary
      await rejects(assets.startAssetHandover({ asset_id: asset.id, employee_id: employee.id, kind: "return", handover_date: today(), condition: "damaged", checklist: [], damage_charge: 40 }, admin.id), "Describe the damage before charging for it");
      const back = await assets.startAssetHandover({
        asset_id: asset.id, employee_id: employee.id, kind: "return", handover_date: today(), condition: "damaged",
        checklist: [{ key: "baseplate", ok: true }, { key: "rods", ok: false, note: "bent" }], damage_notes: "Rod bent", damage_charge: 40, deduct_from_salary: true,
      }, admin.id, { signature: sig, signer_name: "Employee Name" });
      assert.equal(back.status, "pending_approval");
      assert.equal(back.signedInPerson, true);
      await approveAll(back.id, admin);
      const returned = await tx.asset.findUniqueOrThrow({ where: { id: asset.id } });
      assert.deepEqual([returned.status, returned.holderEmployeeId, returned.condition], ["maintenance", null, "damaged"], "damaged returns go to maintenance");
      const charge = await tx.employeeRecurringPay.findFirstOrThrow({ where: { employeeId: employee.id, category: "damage", label: { contains: asset.assetTag } } });
      assert.equal(Number(charge.amount), 40);
      assert.equal(charge.startMonth, charge.endMonth, "a one-off deduction");

      // ---- rejection and cancellation leave the asset where it was
      await tx.asset.update({ where: { id: asset.id }, data: { status: "available" } });
      const again = await assets.startAssetHandover({ asset_id: asset.id, employee_id: employee.id, kind: "issue", handover_date: today(), condition: "fair", checklist: [] }, admin.id, { signature: sig, signer_name: "Employee Name" });
      await approveAll(again.id, admin, "rejected");
      assert.equal((await tx.assetHandover.findUniqueOrThrow({ where: { id: again.id } })).status, "rejected");
      assert.equal((await tx.asset.findUniqueOrThrow({ where: { id: asset.id } })).status, "available");
      const third = await assets.startAssetHandover({ asset_id: asset.id, employee_id: employee.id, kind: "issue", handover_date: today(), condition: "fair", checklist: [] }, admin.id);
      await assets.cancelAssetHandover(third.id);
      await rejects(assets.cancelAssetHandover(third.id), "Only open handovers can be cancelled");

      const list = await assets.listAssets({ q: "Rig A" });
      assert.equal(list.items[0].id, asset.id);
      throw rollback;
    }), { timeout: 120000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Asset checks passed and rolled back: categories with fields and checklists, asset validation, issue signed by the employee then approved, return in person with damage recovered from salary, rejection and cancellation.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
