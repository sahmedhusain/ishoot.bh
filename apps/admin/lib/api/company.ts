import type { components, paths } from "./generated/system";
import { serviceClient, userClient, unwrap, unwrapEmpty } from "./http";
export type CompanyConfiguration = components["schemas"]["CompanyRecord"];
export type CompanyConfigurationPatch = components["schemas"]["CompanyPatch"];
export type CompanyTheme = components["schemas"]["CompanyTheme"];
export type CompanyAsset = components["schemas"]["CompanyAsset"];
let client: ReturnType<typeof serviceClient<paths>> | undefined;
const system = () => (client ??= serviceClient<paths>());
export const getCompanyConfiguration = () =>
  unwrap(system().GET("/v1/system/company"));
export const getCompanyConfigurationForIT = (token: string) =>
  unwrap(userClient<paths>(token).GET("/v1/system/desk/company"));
export const updateCompanyConfigurationForIT = (
  token: string,
  values: CompanyConfigurationPatch,
) =>
  unwrap(
    userClient<paths>(token).PUT("/v1/system/desk/company", {
      body: { values },
    }),
  );
export const completeCompanySetupForIT = (token: string) =>
  unwrap(userClient<paths>(token).POST("/v1/system/desk/setup/complete"));
export const markCompanyCurrencyUsed = () =>
  unwrapEmpty(system().POST("/v1/system/company/currency-use"));
export const reserveDocumentNumber = async (
  kind: "invoice" | "receipt",
  documentDate: string,
  idempotencyKey: string,
) =>
  (
    await unwrap(
      system().POST("/v1/system/sequences/{kind}/reservations", {
        params: { path: { kind } },
        body: { documentDate, idempotencyKey },
      }),
    )
  ).number;
export const listCompanyAssetsForIT = async (token: string) =>
  (await unwrap(userClient<paths>(token).GET("/v1/system/desk/company/assets")))
    .items;
export const saveCompanyAssetForIT = (
  token: string,
  key: string,
  title: string,
  fileUrl: string,
) =>
  unwrapEmpty(
    userClient<paths>(token).PUT("/v1/system/desk/company/assets/{key}", {
      params: { path: { key } },
      body: { title, fileUrl },
    }),
  );
export const deleteCompanyAssetForIT = (token: string, key: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE("/v1/system/desk/company/assets/{key}", {
      params: { path: { key } },
    }),
  );

export const getCompanySetupStatus = () =>
  unwrap(system().GET("/v1/system/setup/status"));
export const getCompanySetupStatusForIT = (token: string) =>
  unwrap(userClient<paths>(token).GET("/v1/system/desk/setup/status"));
