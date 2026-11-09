import { listVehicles } from "@platform/api-client";

export async function listCourierAgencies(): Promise<any[]> {
  return [];
}

export async function saveCourierAgency(input: any) {
  return { id: "agency-stub", name: input?.name || "Courier Agency" };
}

