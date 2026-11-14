import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";

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
