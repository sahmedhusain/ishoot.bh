import { listVehicles } from "@platform/api-client";

export async function listCourierAgencies(): Promise<any[]> {
  // Not available in API.
  return [];
}

export async function saveCourierAgency(input: any) {
  // Not available in API.
  return { id: "agency-stub", name: input?.name || "Courier Agency" };
}


