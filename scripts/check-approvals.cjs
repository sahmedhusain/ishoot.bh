// Run: node scripts/check-approvals.cjs
// Exercises the approval engine against an in-memory database: routing, maker-checker, escalation and finalizers.
const { realConstants } = require("./lib/real-constants.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id) => {
      if (id in mocks) return mocks[id];
      if (id.startsWith("node:")) return require(id);
      const real = realConstants(file, id);
      if (real) return real;
      throw new Error(`Unmocked dependency: ${id}`);
    },
    console,
    Date,
    Set,
    Map,
    Error,
    JSON,
    Promise,
  });
  return module.exports;
}

const matches = (row, where = {}) =>
  Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && "in" in value) return value.in.includes(row[key]);
    if (value && typeof value === "object" && "has" in value) return (row[key] || []).includes(value.has);
    return row[key] === value;
  });

function createDb() {
  const state = { users: [], policies: [], requests: [], decisions: [], notifications: [], activity: [], payrollRuns: [] };
  let seq = 0;
  const id = (prefix) => `${prefix}-${++seq}`;
  const db = {
    state,
    $queryRaw: async () => [],
    user: {
      findMany: async ({ where }) => state.users.filter((u) => matches(u, where)),
      findUnique: async ({ where }) => state.users.find((u) => u.id === where.id) || null,
      findUniqueOrThrow: async ({ where }) => {
        const user = state.users.find((u) => u.id === where.id);
        if (!user) throw new Error("No user");
        return user;
      },
    },
    approvalPolicy: {
      findUnique: async ({ where }) => {
        const policy = state.policies.find((p) => p.targetType === where.targetType);
        return policy ? { ...policy, steps: [...policy.steps].sort((a, b) => a.order - b.order) } : null;
      },
    },
    approvalRequest: {
      updateMany: async ({ where, data }) => state.requests.filter((r) => matches(r, where)).forEach((r) => Object.assign(r, data)),
      findFirst: async ({ where }) =>
        state.requests.filter((r) => matches(r, where)).sort((a, b) => b.revision - a.revision)[0] || null,
      create: async ({ data }) => {
        const row = { id: id("apr"), ...data };
        state.requests.push(row);
        return row;
      },
      update: async ({ where, data }) => Object.assign(state.requests.find((r) => r.id === where.id), data),
      findUnique: async ({ where }) => {
        const row = state.requests.find((r) => r.id === where.id);
        if (!row) return null;
        const policy = state.policies.find((p) => p.id === row.policyId) || null;
        return {
          ...row,
          policy: policy && { ...policy, steps: [...policy.steps].sort((a, b) => a.order - b.order) },
          decisions: state.decisions.filter((d) => d.approvalRequestId === row.id),
        };
      },
    },
    approvalDecision: { create: async ({ data }) => state.decisions.push({ id: id("dec"), ...data }) },
    notification: { createMany: async ({ data }) => state.notifications.push(...data) },
    activityLog: { create: async ({ data }) => state.activity.push(data) },
    // Records looked up for policy conditions; this harness configures no conditional steps.
    quotation: { findUnique: async () => null },
    invoice: { findUnique: async () => null },
    expense: { findUnique: async () => null },
    expenseClaim: { findUnique: async () => null },
    leaveRequest: { findUnique: async () => null },
    payrollRun: {
      findUnique: async ({ where }) => state.payrollRuns.find((r) => r.id === where.id) || null,
      findUniqueOrThrow: async ({ where }) => state.payrollRuns.find((r) => r.id === where.id),
      update: async ({ where, data }) => Object.assign(state.payrollRuns.find((r) => r.id === where.id), data),
    },
  };
  return db;
}

function createEngine(db, finalized) {
  const record = (type) => ({
    approve: async (targetId, deciderId) => finalized.push({ type, targetId, deciderId, decision: "approved" }),
    reject: async (targetId, deciderId, reason) => finalized.push({ type, targetId, deciderId, decision: "rejected", reason }),
  });
  const leave = record("leave_request");
  return load("packages/database/src/services/approval-engine.ts", {
    "../db": { db, runAtomicMutation: async (fn) => fn() },
    "../queries/permissions": {
      // Admins and HR hold employees:approve; Super Admin holds everything.
      hasPermission: async (role, resource, action) =>
        role === "super_admin" || (role === "admin" && resource === "employees" && action === "approve"),
    },
    "../queries/leave": { approveLeaveRequest: leave.approve, rejectLeaveRequest: leave.reject },
    "../queries/profile-changes": { approveProfileChange: async () => {}, rejectProfileChange: async () => {} },
    "../queries/salary-documents": { salaryDocumentSnapshot: async () => ({}) },
    "../queries/inquiries": { approveRequest: async () => {}, returnRequest: async () => {} },
    "../queries/signature-changes": { approveSignatureChange: async () => {}, rejectSignatureChange: async () => {} },
    "../queries/fx-settlement": { getLatestExchangeRate: async () => ({ rate: 1 }) },
    "../queries/account-changes": { approveAccountChange: async () => {}, rejectAccountChange: async () => {} },
  });
}

const leavePolicy = {
  id: "pol-leave",
  targetType: "leave_request",
  enabled: true,
  allowSelfApproval: false,
  autoApproveRoles: [],
  steps: [
    { order: 1, approverMode: "manager", roleKey: null, userId: null, permission: null },
    { order: 2, approverMode: "permission", roleKey: null, userId: null, permission: "employees:approve" },
  ],
};

async function main() {
  // 1. An accountant files leave: their manager approves, then HR; the accountant can never decide it.
  {
    const db = createDb();
    const finalized = [];
    db.state.users.push(
      { id: "acc", role: "accountant", managerId: "mgr", isActive: true },
      { id: "mgr", role: "finance_manager", managerId: null, isActive: true },
      { id: "hr", role: "admin", managerId: null, isActive: true },
    );
    db.state.policies.push(structuredClone(leavePolicy));
    const engine = createEngine(db, finalized);
    const submitted = await engine.submitForApproval({ targetType: "leave_request", targetId: "leave-1", requesterId: "acc" });
    assert.equal(submitted.status, "pending");
    assert.deepEqual(submitted.approverIds, ["mgr"], "step 1 routes to the requester's manager");
    assert.equal(db.state.notifications.filter((n) => n.userId === "mgr").length, 1, "the manager is notified");
    await assert.rejects(engine.decideApprovalRequest(submitted.approvalRequestId, "acc", "approved"), /your own request/);
    await assert.rejects(engine.decideApprovalRequest(submitted.approvalRequestId, "hr", "approved"), /not an approver/);
    const afterManager = await engine.decideApprovalRequest(submitted.approvalRequestId, "mgr", "approved");
    assert.equal(afterManager.status, "pending");
    assert.deepEqual(afterManager.approverIds, ["hr"], "step 2 routes to HR, excluding people who already approved");
    assert.equal(finalized.length, 0, "the leave is not applied until the last step");
    const done = await engine.decideApprovalRequest(submitted.approvalRequestId, "hr", "approved");
    assert.equal(done.status, "approved");
    assert.deepEqual(finalized, [{ type: "leave_request", targetId: "leave-1", deciderId: "hr", decision: "approved" }]);
    assert.equal(db.state.notifications.at(-1).userId, "acc", "the requester is notified of the outcome");
  }

  // 2. A requester's own request goes to someone else and they cannot decide it themselves.
  {
    const db = createDb();
    const finalized = [];
    db.state.users.push(
      { id: "prod", role: "producer", managerId: null, isActive: true },
      { id: "hr", role: "admin", managerId: null, isActive: true },
    );
    db.state.policies.push(structuredClone(leavePolicy));
    const engine = createEngine(db, finalized);
    const submitted = await engine.submitForApproval({ targetType: "leave_request", targetId: "leave-2", requesterId: "prod" });
    assert.equal(submitted.status, "pending");
    assert.deepEqual(submitted.approverIds, ["hr"], "an empty manager step is skipped");
    const request = db.state.requests[0];
    assert.equal(engine.canDecideApproval(request, { id: "prod", role: "producer" }), false);
    await assert.rejects(engine.decideApprovalRequest(submitted.approvalRequestId, "prod", "approved"), /your own request/);
    await assert.rejects(engine.decideApprovalRequest(submitted.approvalRequestId, "hr", "rejected"), /reason is required/);
    const rejected = await engine.decideApprovalRequest(submitted.approvalRequestId, "hr", "rejected", "Peak production week");
    assert.equal(rejected.status, "rejected");
    assert.equal(finalized[0].decision, "rejected");
  }

  // 2b. Super Admin's own requests are approved immediately and recorded as such.
  {
    const db = createDb();
    const finalized = [];
    db.state.users.push(
      { id: "root", role: "super_admin", managerId: null, isActive: true },
      { id: "hr", role: "admin", managerId: null, isActive: true },
    );
    db.state.policies.push(structuredClone(leavePolicy));
    const engine = createEngine(db, finalized);
    const submitted = await engine.submitForApproval({ targetType: "leave_request", targetId: "leave-root", requesterId: "root" });
    assert.equal(submitted.status, "approved", "Super Admin requests are auto-approved");
    assert.equal(finalized[0].decision, "approved");
  }

  // 3. Super Admin may step in on other people's requests even when not a listed approver.
  {
    const db = createDb();
    const finalized = [];
    db.state.users.push(
      { id: "acc", role: "accountant", managerId: "mgr", isActive: true },
      { id: "mgr", role: "finance_manager", managerId: null, isActive: true },
      { id: "root", role: "super_admin", managerId: null, isActive: true },
    );
    db.state.policies.push({ ...structuredClone(leavePolicy), steps: [leavePolicy.steps[0]] });
    const engine = createEngine(db, finalized);
    const submitted = await engine.submitForApproval({ targetType: "leave_request", targetId: "leave-3", requesterId: "acc" });
    const done = await engine.decideApprovalRequest(submitted.approvalRequestId, "root", "approved");
    assert.equal(done.status, "approved");
  }

  // 4. A sole administrator with nobody else to ask is approved immediately and flagged.
  {
    const db = createDb();
    const finalized = [];
    db.state.users.push({ id: "solo", role: "admin", managerId: null, isActive: true });
    db.state.policies.push(structuredClone(leavePolicy));
    const engine = createEngine(db, finalized);
    const submitted = await engine.submitForApproval({ targetType: "leave_request", targetId: "leave-4", requesterId: "solo" });
    assert.equal(submitted.status, "approved");
    assert.equal(db.state.requests[0].selfApproved, true, "self-approval is recorded, never silent");
    assert.equal(finalized.length, 1);
  }

  // 5. Disabled policies and auto-approve roles approve on submit.
  {
    const db = createDb();
    const finalized = [];
    db.state.users.push({ id: "acc", role: "accountant", managerId: "mgr", isActive: true }, { id: "mgr", role: "admin", managerId: null, isActive: true });
    db.state.policies.push({ ...structuredClone(leavePolicy), autoApproveRoles: ["accountant"] });
    const engine = createEngine(db, finalized);
    const submitted = await engine.submitForApproval({ targetType: "leave_request", targetId: "leave-5", requesterId: "acc" });
    assert.equal(submitted.status, "approved");
    assert.equal(db.state.decisions[0].reason, "policy_auto");
  }

  // 6. Payroll approval refuses runs that already moved on (e.g. paid) instead of rewriting them.
  {
    const db = createDb();
    db.state.users.push({ id: "fin", role: "finance_manager", managerId: null, isActive: true }, { id: "root", role: "super_admin", managerId: null, isActive: true });
    db.state.policies.push({ id: "pol-pay", targetType: "payroll_run", enabled: true, allowSelfApproval: false, autoApproveRoles: [], steps: [{ order: 1, approverMode: "role", roleKey: "super_admin" }] });
    db.state.payrollRuns.push({ id: "run-1", status: "submitted" });
    const engine = createEngine(db, []);
    const submitted = await engine.submitForApproval({ targetType: "payroll_run", targetId: "run-1", requesterId: "fin" });
    db.state.payrollRuns[0].status = "paid";
    await assert.rejects(engine.decideApprovalRequest(submitted.approvalRequestId, "root", "approved"), /can no longer be approved/);
    assert.equal(db.state.payrollRuns[0].status, "paid");
  }

  // 7. Resubmitting supersedes the previous round and uses the next revision.
  {
    const db = createDb();
    db.state.users.push({ id: "acc", role: "accountant", managerId: "mgr", isActive: true }, { id: "mgr", role: "admin", managerId: null, isActive: true });
    db.state.policies.push(structuredClone(leavePolicy));
    const engine = createEngine(db, []);
    await engine.submitForApproval({ targetType: "leave_request", targetId: "leave-7", requesterId: "acc" });
    await engine.submitForApproval({ targetType: "leave_request", targetId: "leave-7", requesterId: "acc" });
    assert.deepEqual(db.state.requests.map((r) => [r.revision, r.status]), [[1, "superseded"], [2, "pending"]]);
  }

  console.log("Approval checks passed: manager → HR routing, maker-checker below Super Admin, Super Admin auto-approval and override on others, recorded sole-admin self-approval, auto-approve policies, payroll state guard, revision supersede.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
