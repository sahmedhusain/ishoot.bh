import {
  listEmployees as listEmployeesApi,
  getEmployee as getEmployeeApi,
  createEmployee as createEmployeeApi,
  listDepartments as listDepartmentsApi,
} from "@platform/api-client";
import { Employee, Department } from "../types";

export async function createEmployee(
  data: any,
  actorId: string,
): Promise<Employee> {
  return createEmployeeApi(data, "service-token") as any;
}

export async function listEmployees(filters: any): Promise<{ items: Employee[]; total: number }> {
  const employees = await listEmployeesApi("service-token");
  const filtered = ((employees as any) || []).filter((e: any) => {
    if (filters.departmentId && e.departmentId !== filters.departmentId) return false;
    if (filters.status && e.status !== filters.status) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      return e.employeeNumber?.toLowerCase().includes(s) || e.firstNameEn?.toLowerCase().includes(s) || e.lastNameEn?.toLowerCase().includes(s);
    }
    return true;
  });
  const pageSize = 25;
  const page = Math.max(1, filters.page || 1);
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  return {
    total: filtered.length,
    items: items,
  };
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  return getEmployeeApi(id, "service-token") as any;
}

export async function listDepartments(): Promise<Department[]> {
  return listDepartmentsApi() as any;
}

export async function createDepartment(data: any): Promise<Department> {
  return { id: "dept-1", ...data } as Department;
}

export async function updateDepartment(id: string, data: any): Promise<Department> {
  return { id, ...data } as Department;
}

export async function updateEmployee(
  id: string,
  data: any,
  actorId: string,
): Promise<Employee> {
  throw new Error("updateEmployee is not implemented in API");
}
