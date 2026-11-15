import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { listAllPayrollItemsApi, listEmployees, listPayrollRuns } from "../api/hr";
import { listTableRows, upsertTableRow } from "../api/tables";
import { parsePayrollSettings, supportBreakdown } from "../payroll-calculation";
import { SUPPORT_CLAIM_MONTHS, addMonths } from "../constants/hr-support";

export interface SupportClaimRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  provider: string;
  periodStart: string;
  periodEnd: string;
  monthsAccrued: number;
  accrued: number;
  status: "accruing" | "claimable" | "received";
  receipt: {
    amount: number;
    receivedOn: string;
    reference: string | null;
  } | null;
}

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;
const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

export async function getSupportClaims(): Promise<SupportClaimRow[]> {
  const [allItems, allRuns, allEmps, receipts] = await Promise.all([
    listAllPayrollItemsApi(),
    listPayrollRuns(),
    listEmployees(),
    listTableRows("itsm", "support_reimbursement"),
  ]);
  const runById = new Map<string, any>(allRuns.map((r: any) => [r.id, r]));
  const empById = new Map<string, any>(allEmps.map((e: any) => [e.id, e]));
  const items = allItems
    .filter((i: any) => {
      const run = runById.get(i.payrollRunId);
      return Number(i.externalSupport ?? 0) > 0 && run && ["approved", "paid", "closed"].includes(run.status);
    })
    .map((i: any) => ({
      ...i,
      payrollRun: runById.get(i.payrollRunId),
      employee: empById.get(i.employeeId) ?? { firstNameEn: "", lastNameEn: "", employeeNumber: "" },
    }));

  const programmes = new Map<
    string,
    {
      employeeId: string;
      name: string;
      number: string;
      provider: string;
      anchor: string;
      claimPeriodMonths: number;
      months: Map<string, number>;
    }
  >();
  for (const item of items) {
    const month = monthKey(item.payrollRun.year, item.payrollRun.month);
    const fixed =
      Number(item.basicSalary) +
      Number(item.housingAllowance) +
      Number(item.transportAllowance) +
      Number(item.otherAllowances);
    const settings = parsePayrollSettings(item.calculationSnapshot);
    const providerStarts = new Map<string, string>();
    for (const s of settings?.supports ?? []) {
      const provider = s.provider.trim();
      const earliest = providerStarts.get(provider);
      if (!earliest || s.startMonth < earliest)
        providerStarts.set(provider, s.startMonth);
    }
    const snapshotLines = (
      item.calculationSnapshot as {
        supportLines?: Array<{
          provider: string;
          startMonth: string;
          claimPeriodMonths?: number;
          amount: number;
        }> | null;
      } | null
    )?.supportLines;
    if (Array.isArray(snapshotLines))
      for (const l of snapshotLines)
        if (
          !providerStarts.has(l.provider) ||
          l.startMonth < providerStarts.get(l.provider)!
        )
          providerStarts.set(l.provider, l.startMonth);
    const parts = Array.isArray(snapshotLines)
      ? snapshotLines.map((l) => ({
          provider: l.provider,
          amount: l.amount,
          anchor: l.startMonth,
          claimPeriodMonths: l.claimPeriodMonths ?? SUPPORT_CLAIM_MONTHS,
        }))
      : supportBreakdown(fixed, settings, month, (item.calculationSnapshot as { currency?: string } | null)?.currency).map((p) => ({
          ...p,
          anchor: providerStarts.get(p.provider) ?? month,
          claimPeriodMonths: p.claimPeriodMonths ?? SUPPORT_CLAIM_MONTHS,
        }));
    for (const part of parts) {
      const key = `${item.employeeId}|${part.provider}|${part.anchor}|${part.claimPeriodMonths}`;
      const row = programmes.get(key) ?? {
        employeeId: item.employeeId,
        name: `${item.employee.firstNameEn} ${item.employee.lastNameEn}`,
        number: item.employee.employeeNumber,
        provider: part.provider,
        anchor: part.anchor,
        claimPeriodMonths: part.claimPeriodMonths,
        months: new Map<string, number>(),
      };
      row.months.set(month, (row.months.get(month) ?? 0) + part.amount);
      programmes.set(key, row);
    }
  }

  const today = new Date().toISOString().slice(0, 7);
  const rows: SupportClaimRow[] = [];
  for (const p of Array.from(programmes.values())) {
    const windows = new Map<string, { months: number; amount: number }>();
    for (const [month, amount] of Array.from(p.months.entries())) {
      const index = Math.floor(
        monthsBetween(p.anchor, month) / p.claimPeriodMonths,
      );
      const start = addMonths(p.anchor, index * p.claimPeriodMonths);
      const w = windows.get(start) ?? { months: 0, amount: 0 };
      w.months++;
      w.amount += amount;
      windows.set(start, w);
    }
    for (const [start, w] of Array.from(windows.entries())) {
      const end = addMonths(start, p.claimPeriodMonths - 1);
      const receipt = receipts.find(
        (r) =>
          r.employeeId === p.employeeId &&
          r.provider === p.provider &&
          r.periodStart === start,
      );
      rows.push({
        employeeId: p.employeeId,
        employeeName: p.name,
        employeeNumber: p.number,
        provider: p.provider,
        periodStart: start,
        periodEnd: end,
        monthsAccrued: w.months,
        accrued: Math.round(w.amount * 1000) / 1000,
        status: receipt ? "received" : end < today ? "claimable" : "accruing",
        receipt: receipt
          ? {
              amount: Number(receipt.receivedAmount),
              receivedOn: receipt.receivedOn.toISOString().slice(0, 10),
              reference: receipt.reference,
            }
          : null,
      });
    }
  }
  return rows.sort(
    (a, b) =>
      b.periodStart.localeCompare(a.periodStart) ||
      a.employeeName.localeCompare(b.employeeName),
  );
}

export async function recordSupportReimbursement(
  input: {
    employeeId: string;
    provider: string;
    periodStart: string;
    receivedAmount: number;
    receivedOn: string;
    reference?: string | null;
  },
  actorId: string,
) {
  return runAtomicMutation(async () => {
    const claim = (await getSupportClaims()).find(
      (c) =>
        c.employeeId === input.employeeId &&
        c.provider === input.provider &&
        c.periodStart === input.periodStart,
    );
    if (!claim)
      throw new Error(serverMessages.noSupportAccruedForThatEmployeeAnd);
    if (claim.status === "received")
      throw new Error(serverMessages.thisClaimIsAlreadyRecordedAsReceived);
    if (claim.status === "accruing")
      throw new Error(serverMessages.theSixMonthPeriodHasNotEnded);
    if (!(Number.isFinite(input.receivedAmount) && input.receivedAmount >= 0))
      throw new Error(serverMessages.enterTheAmountReceived);
    const receivedOn = new Date(input.receivedOn);
    if (Number.isNaN(receivedOn.getTime()))
      throw new Error(serverMessages.enterTheDateItWasReceived);
    return upsertTableRow("itsm", "support_reimbursement", {
      employeeId: input.employeeId,
      provider: input.provider,
      periodStart: claim.periodStart,
      periodEnd: claim.periodEnd,
      claimedAmount: claim.accrued,
      receivedAmount: Math.round(input.receivedAmount * 1000) / 1000,
      receivedOn: receivedOn.toISOString(),
      reference: input.reference?.trim() || null,
      recordedById: actorId,
    });
  });
}
