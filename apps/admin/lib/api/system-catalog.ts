import { serviceFetch, buildQuery } from "./service-fetch";

export type SystemServiceCatalogItem = {
  id: string;
  code: string;
  nameEn?: string | null;
  nameAr?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  category?: string | null;
  defaultRate?: string | number | null;
  unit?: string | null;
  isPublic?: boolean | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SystemProject = {
  id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  departmentId?: string | null;
  clientId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const listSystemServices = (activeOnly?: boolean, token?: string) =>
  serviceFetch<SystemServiceCatalogItem[]>(
    `/v1/system/services${buildQuery({ active: activeOnly ? "true" : undefined })}`,
    {},
    token,
  );

export const getSystemService = (id: string, token?: string) =>
  serviceFetch<SystemServiceCatalogItem>(
    `/v1/system/services/${encodeURIComponent(id)}`,
    {},
    token,
  );

export const createSystemService = (
  input: Partial<SystemServiceCatalogItem>,
  token?: string,
) =>
  serviceFetch<SystemServiceCatalogItem>(
    "/v1/system/services",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export const updateSystemService = (
  id: string,
  input: Partial<SystemServiceCatalogItem>,
  token?: string,
) =>
  serviceFetch<SystemServiceCatalogItem>(
    `/v1/system/services/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(input) },
    token,
  );

export const deleteSystemService = (id: string, token?: string) =>
  serviceFetch<void>(
    `/v1/system/services/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token,
  );

export const listSystemProjects = (token?: string) =>
  serviceFetch<SystemProject[]>("/v1/system/projects", {}, token);

export const getSystemProject = (id: string, token?: string) =>
  serviceFetch<SystemProject>(
    `/v1/system/projects/${encodeURIComponent(id)}`,
    {},
    token,
  );

export const createSystemProject = (
  input: Partial<SystemProject>,
  token?: string,
) =>
  serviceFetch<SystemProject>(
    "/v1/system/projects",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );

export const updateSystemProject = (
  id: string,
  input: Partial<SystemProject>,
  token?: string,
) =>
  serviceFetch<SystemProject>(
    `/v1/system/projects/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify(input) },
    token,
  );

export const deleteSystemProject = (id: string, token?: string) =>
  serviceFetch<void>(
    `/v1/system/projects/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token,
  );
