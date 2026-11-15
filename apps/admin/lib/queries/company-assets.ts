import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";

export interface CompanyAssetItem {
  id: string;
  assetKey: string;
  title: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  updatedAt: string;
  createdAt: string;
}

const toIso = (v: unknown) => (v ? new Date(v as any).toISOString() : new Date().toISOString());

function mapAsset(a: Record<string, any>): CompanyAssetItem {
  return {
    id: String(a.id),
    assetKey: String(a.assetKey ?? ""),
    title: String(a.title ?? ""),
    fileUrl: String(a.fileUrl ?? ""),
    mimeType: a.mimeType || undefined,
    fileSize: a.fileSize || undefined,
    updatedAt: toIso(a.updatedAt),
    createdAt: toIso(a.createdAt),
  };
}

export async function getCompanyAssets(): Promise<CompanyAssetItem[]> {
  try {
    const assets = await listTableRows<Record<string, any>>("system", "company_asset", "created_at ASC");
    return assets
      .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
      .map(mapAsset);
  } catch (e) {
    console.error("Error fetching company assets:", e);
    throw e;
  }
}

export async function getCompanyAsset(
  assetKey: string,
): Promise<CompanyAssetItem | null> {
  try {
    const assets = await listTableRows<Record<string, any>>("system", "company_asset");
    const asset = assets.find((a) => a.assetKey === assetKey);
    return asset ? mapAsset(asset) : null;
  } catch (e) {
    console.error(`Error fetching company asset ${assetKey}:`, e);
    throw e;
  }
}

export async function upsertCompanyAsset(
  assetKey: string,
  data: {
    title: string;
    fileUrl: string;
    mimeType?: string;
    fileSize?: number;
  },
): Promise<CompanyAssetItem> {
  const existing = await getCompanyAsset(assetKey);
  const asset = await upsertTableRow<Record<string, any>>("system", "company_asset", {
    id: existing?.id || crypto.randomUUID(),
    assetKey,
    title: data.title,
    fileUrl: data.fileUrl,
    mimeType: data.mimeType ?? null,
    fileSize: data.fileSize ?? null,
  });
  return mapAsset(asset);
}

export async function deleteCompanyAsset(assetKey: string): Promise<boolean> {
  try {
    const existing = await getCompanyAsset(assetKey);
    if (existing) {
      await deleteTableRow("system", "company_asset", existing.id);
    }
    return true;
  } catch (e) {
    console.error(`Error deleting company asset ${assetKey}:`, e);
    throw e;
  }
}
