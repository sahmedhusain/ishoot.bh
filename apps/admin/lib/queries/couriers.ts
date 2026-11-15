import { listCourierAgenciesApi, saveCourierAgencyApi } from "../api/delivery";

export async function listCourierAgencies() {
  return listCourierAgenciesApi();
}

export async function saveCourierAgency(input: {
  id?: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  apiEndpoint?: string | null;
  isActive?: boolean;
}) {
  return saveCourierAgencyApi({
    ...input,
    isActive: input.isActive ?? true,
  });
}
