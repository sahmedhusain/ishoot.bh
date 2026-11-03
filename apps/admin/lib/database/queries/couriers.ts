import { listVehicles } from "@platform/api-client";

export async function listCourierAgencies() {
  // Not available in API.
  return [];
}

export async function saveCourierAgency(input: any) {
  // Not available in API.
  return { id: "agency-stub", name: input?.name || "Courier Agency" };
}

export async function handToAgency(shipmentId: string, agencyId: string, actorId: string) {
  return { id: shipmentId };
}
