import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";
import { listTableRows } from "./tables";

export type Department = {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  headId?: string | null;
  parentId?: string | null;
};

export type Employee = {
  id: string;
  employeeNumber: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  email: string;
  phone?: string | null;
  jobTitleEn: string;
  jobTitleAr: string;
  departmentId?: string | null;
  hireDate: string;
  status: string;
  basicSalary: string;
  housingAllowance: string;
  transportAllowance: string;
  otherAllowances: string;
  createdAt: string;
  updatedAt: string;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: string;
  status: string;
  reason?: string | null;
  approvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayrollRun = {
  id: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
  currency: string;
  processedAt?: string | null;
  approvedBy?: string | null;
  createdAt: string;
};

export type PayrollItem = {
  id: string;
  payrollRunId: string;
  employeeId: string;
  basicSalary: string;
  allowances: string;
  deductions: string;
  netSalary: string;
  status: string;
};

export type PayrollRunWithItems = PayrollRun & {
  items: PayrollItem[];
};

async function hrFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    const st = await serviceToken();
    if (st) headers.set("Authorization", `Bearer ${st}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
    }
    throw await apiError(res, errBody);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }
  const body = await res.json();
  return normalizeApiRecord(body) as T;
}

export const listDepartments = (token?: string) =>
  hrFetch<Department[]>("/v1/hr/departments", {}, token);

export const createDepartment = (input: Partial<Department>, token?: string) =>
  hrFetch<Department>("/v1/hr/departments", { method: "POST", body: JSON.stringify(input) }, token);

export const listEmployees = (token?: string) =>
  hrFetch<Employee[]>("/v1/hr/employees", {}, token);

export const getEmployee = (id: string, token?: string) =>
  hrFetch<Employee>(`/v1/hr/employees/${encodeURIComponent(id)}`, {}, token);

export const createEmployee = (input: Partial<Employee>, token?: string) =>
  hrFetch<Employee>("/v1/hr/employees", { method: "POST", body: JSON.stringify(input) }, token);

export const offboardEmployee = (id: string, token?: string) =>
  hrFetch<Employee>(`/v1/hr/employees/${encodeURIComponent(id)}/offboard`, { method: "POST" }, token);

export const deleteEmployee = (id: string, token?: string) =>
  hrFetch<void>(`/v1/hr/employees/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listLeaveRequests = (employeeId?: string, token?: string) => {
  const q = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : "";
  return hrFetch<LeaveRequest[]>(`/v1/hr/leave${q}`, {}, token);
};

export const createLeaveRequest = (input: Partial<LeaveRequest>, token?: string) =>
  hrFetch<LeaveRequest>("/v1/hr/leave", { method: "POST", body: JSON.stringify(input) }, token);

export const approveLeaveRequest = (id: string, approvedBy: string, token?: string) =>
  hrFetch<LeaveRequest>(`/v1/hr/leave/${encodeURIComponent(id)}/approve`, {
    method: "PUT",
    body: JSON.stringify({ approvedBy }),
  }, token);

export const listPayrollRuns = (token?: string) =>
  hrFetch<PayrollRun[]>("/v1/hr/payroll", {}, token);

export const createPayrollRun = (input: any, token?: string) =>
  hrFetch<PayrollRunWithItems>("/v1/hr/payroll", { method: "POST", body: JSON.stringify(input) }, token);

export const processPayrollRun = (id: string, approvedBy: string, token?: string) =>
  hrFetch<PayrollRun>(`/v1/hr/payroll/${encodeURIComponent(id)}/process`, {
    method: "PUT",
    body: JSON.stringify({ approvedBy }),
  }, token);

export type EmployeeCredential = {
  id: string;
  employeeId: string;
  kind: string;
  visaType?: string | null;
  label: string;
  number?: string | null;
  issuingCountry?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  sponsor?: string | null;
  costAmount?: number | null;
  costCurrency?: string | null;
  costFrequency?: string | null;
  costTermMonths?: number | null;
  paidBy?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeHandover = {
  id: string;
  reference: string;
  employeeId: string;
  employeeName?: string;
  kind: string;
  leaveRequestId?: string | null;
  effectiveDate?: string | null;
  returnDate?: string | null;
  reason?: string | null;
  status: string;
  casesMode?: string | null;
  delegateUserId?: string | null;
  delegateName?: string;
};

export type EmployeeRecurringPay = {
  id: string;
  employeeId: string;
  kind: string;
  category: string;
  label: string;
  amount: number;
  startMonth?: string | null;
  endMonth?: string | null;
  isActive: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeaveBalance = {
  id: string;
  employeeId: string;
  leaveTypeId?: string | null;
  leaveType: string;
  year: number;
  entitledDays: number;
  usedDays: number;
  remainingDays: number;
  updatedAt: string;
};

export type EmployeePayItem = {
  id: string;
  payrollRunId: string;
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  runStatus: string;
  currency: string;
  basicSalary: string;
  allowances: string;
  deductions: string;
  netSalary: string;
  status: string;
  paymentStatus?: string | null;
  paidAt?: string | null;
};

export type EmployeeRelations = Employee & {
  userId?: string | null;
  managerId?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  cprNumber?: string | null;
  cprExpiryDate?: string | null;
  passportNumber?: string | null;
  passportCountry?: string | null;
  passportExpiryDate?: string | null;
  credentials?: EmployeeCredential[];
  handovers?: EmployeeHandover[];
  recurringPay?: EmployeeRecurringPay[];
  leaveBalances?: LeaveBalance[];
  payItems?: EmployeePayItem[];
};

export type HRIdentityUserRef = {
  subjectId: string;
  realm: string;
  displayName: string;
  email: string;
  status: string;
  employeeId?: string | null;
  updatedAt: string;
};

export const getEmployeeRelations = (id: string, token?: string) =>
  hrFetch<EmployeeRelations>(`/v1/hr/employees/${encodeURIComponent(id)}/relations`, {}, token);

export const updateEmployeeLinks = (
  id: string,
  patch: { userId?: string; managerId?: string; departmentId?: string; status?: string; jobTitleEn?: string; jobTitleAr?: string; phone?: string },
  token?: string,
) =>
  hrFetch<{ employeeId: string; userId?: string | null; managerId?: string | null }>(
    `/v1/hr/employees/${encodeURIComponent(id)}/links`,
    { method: "PUT", body: JSON.stringify(patch) },
    token,
  );

export const listEmployeePayItems = (id: string, token?: string) =>
  hrFetch<EmployeePayItem[]>(`/v1/hr/employees/${encodeURIComponent(id)}/pay-items`, {}, token);

export const listEmployeeCredentials = (employeeId?: string, token?: string) =>
  hrFetch<EmployeeCredential[]>(
    `/v1/hr/credentials${employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""}`,
    {},
    token,
  );

export const saveEmployeeCredential = (input: Partial<EmployeeCredential>, token?: string) =>
  hrFetch<EmployeeCredential>(
    input.id ? `/v1/hr/credentials/${encodeURIComponent(input.id)}` : "/v1/hr/credentials",
    { method: input.id ? "PUT" : "POST", body: JSON.stringify(input) },
    token,
  );

export const deleteEmployeeCredential = (id: string, token?: string) =>
  hrFetch<void>(`/v1/hr/credentials/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listEmployeeHandovers = (filters?: { employeeId?: string; delegateUserId?: string }, token?: string) => {
  const qs = new URLSearchParams();
  if (filters?.employeeId) qs.set("employeeId", filters.employeeId);
  if (filters?.delegateUserId) qs.set("delegateUserId", filters.delegateUserId);
  const s = qs.toString();
  return hrFetch<EmployeeHandover[]>(`/v1/hr/handovers${s ? `?${s}` : ""}`, {}, token);
};

export const saveEmployeeHandover = (input: Partial<EmployeeHandover>, token?: string) =>
  hrFetch<EmployeeHandover>(
    input.id ? `/v1/hr/handovers/${encodeURIComponent(input.id)}` : "/v1/hr/handovers",
    { method: input.id ? "PUT" : "POST", body: JSON.stringify(input) },
    token,
  );

export const listEmployeeRecurringPay = (employeeId?: string, token?: string) =>
  hrFetch<EmployeeRecurringPay[]>(
    `/v1/hr/recurring-pay${employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""}`,
    {},
    token,
  );

export const saveEmployeeRecurringPay = (input: Partial<EmployeeRecurringPay>, token?: string) =>
  hrFetch<EmployeeRecurringPay>(
    input.id ? `/v1/hr/recurring-pay/${encodeURIComponent(input.id)}` : "/v1/hr/recurring-pay",
    { method: input.id ? "PUT" : "POST", body: JSON.stringify(input) },
    token,
  );

export const deleteEmployeeRecurringPay = (id: string, token?: string) =>
  hrFetch<void>(`/v1/hr/recurring-pay/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const listLeaveBalances = (filters?: { employeeId?: string; year?: number }, token?: string) => {
  const qs = new URLSearchParams();
  if (filters?.employeeId) qs.set("employeeId", filters.employeeId);
  if (filters?.year) qs.set("year", String(filters.year));
  const s = qs.toString();
  return hrFetch<LeaveBalance[]>(`/v1/hr/leave-balances${s ? `?${s}` : ""}`, {}, token);
};

export const saveLeaveBalance = (input: Partial<LeaveBalance>, token?: string) =>
  hrFetch<LeaveBalance>("/v1/hr/leave-balances", { method: "POST", body: JSON.stringify(input) }, token);

export const listAttendanceEntries = (filters?: { employeeId?: string; date?: string }, token?: string) => {
  const qs = new URLSearchParams();
  if (filters?.employeeId) qs.set("employeeId", filters.employeeId);
  if (filters?.date) qs.set("date", filters.date);
  const s = qs.toString();
  return hrFetch<any[]>(`/v1/hr/attendance${s ? `?${s}` : ""}`, {}, token);
};

export const recordAttendanceEntry = (input: { id?: string; employeeId: string; entryDate?: string; status?: string; notes?: string }, token?: string) =>
  hrFetch<any>("/v1/hr/attendance", { method: "POST", body: JSON.stringify(input) }, token);

export const listHRUsers = (realm?: string, token?: string) =>
  hrFetch<HRIdentityUserRef[]>(`/v1/hr/users${realm ? `?realm=${encodeURIComponent(realm)}` : ""}`, {}, token);

export const updateDepartment = (id: string, input: Partial<Department>, token?: string) =>
  hrFetch<Department>(`/v1/hr/departments/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const deleteDepartmentApi = (id: string, token?: string) =>
  hrFetch<void>(`/v1/hr/departments/${encodeURIComponent(id)}`, { method: "DELETE" }, token);

export const assignUsersToDepartmentApi = (userIds: string[], departmentId: string | null, token?: string) =>
  hrFetch<void>("/v1/hr/departments/assign-users", { method: "POST", body: JSON.stringify({ userIds, departmentId }) }, token);

export const updateEmployeeApi = (id: string, input: Partial<Employee>, token?: string) =>
  hrFetch<Employee>(`/v1/hr/employees/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }, token);

export const listLeaveTypesApi = (token?: string) =>
  hrFetch<any[]>("/v1/hr/leave-types", {}, token);

export const listPublicHolidaysApi = (token?: string) =>
  listTableRows<any>("system", "public_holiday", "date ASC", token);

export const listShiftTypesApi = (token?: string) =>
  hrFetch<any[]>("/v1/hr/shift-types", {}, token);

export const listGosiComponentsApi = (token?: string) =>
  hrFetch<any[]>("/v1/hr/gosi/components", {}, token);

export const listEmployeeGosiRecordsApi = (token?: string) =>
  hrFetch<any[]>("/v1/hr/gosi/records", {}, token);

export const getGosiSettingsApi = (token?: string) =>
  hrFetch<any[]>("/v1/hr/gosi/settings", {}, token);

export const listFinalSettlementsApi = (token?: string) =>
  listTableRows<any>("system", "final_settlement", "last_working_day DESC", token);

export const listSalaryDocumentsApi = (token?: string) =>
  hrFetch<any[]>("/v1/hr/salary-documents", {}, token);

export const listSupportProgramsApi = (token?: string) =>
  listTableRows<any>("itsm", "support_program", "name_en ASC", token);

export const listEmployeeSupportsApi = (token?: string) =>
  hrFetch<any[]>("/v1/hr/employee-supports", {}, token);

export const listAllPayrollItemsApi = (token?: string) =>
  hrFetch<any[]>("/v1/hr/payroll-items", {}, token);

export const listLeaveAdjustmentsApi = (token?: string) =>
  hrFetch<any[]>("/v1/hr/leave-adjustments", {}, token);

export const saveShiftTypeApi = (input: Record<string, any>, token?: string) =>
  hrFetch<any>("/v1/hr/shift-types", { method: "POST", body: JSON.stringify(input) }, token);

export const saveLeaveTypeApi = (input: Record<string, any>, token?: string) =>
  hrFetch<any>("/v1/hr/leave-types", { method: "POST", body: JSON.stringify(input) }, token);

export const deleteAttendanceEntryApi = (employeeId: string, date: string, token?: string) =>
  hrFetch<void>(
    `/v1/hr/attendance?employeeId=${encodeURIComponent(employeeId)}&date=${encodeURIComponent(date)}`,
    { method: "DELETE" },
    token,
  );
