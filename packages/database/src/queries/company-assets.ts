import { db } from "../db";

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

function mapAsset(a: any): CompanyAssetItem {
  return {
    id: a.id,
    assetKey: a.assetKey,
    title: a.title,
    fileUrl: a.fileUrl,
    mimeType: a.mimeType || undefined,
    fileSize: a.fileSize || undefined,
    updatedAt: a.updatedAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
  };
}

export async function getCompanyAssets(): Promise<CompanyAssetItem[]> {
  try {
    const assets = await db.companyAsset.findMany({
      orderBy: { createdAt: "asc" },
    });
    return assets.map(mapAsset);
  } catch (e) {
    console.error("Error fetching company assets:", e);
    return [];
  }
}

export async function getCompanyAsset(
  assetKey: string,
): Promise<CompanyAssetItem | null> {
  try {
    const asset = await db.companyAsset.findUnique({
      where: { assetKey },
    });
    return asset ? mapAsset(asset) : null;
  } catch (e) {
    console.error(`Error fetching company asset ${assetKey}:`, e);
    return null;
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
  const asset = await db.companyAsset.upsert({
    where: { assetKey },
    update: {
      title: data.title,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    },
    create: {
      assetKey,
      title: data.title,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
    },
  });
  return mapAsset(asset);
}

export async function deleteCompanyAsset(assetKey: string): Promise<boolean> {
  try {
    await db.companyAsset.delete({
      where: { assetKey },
    });
    return true;
  } catch (e) {
    console.error(`Error deleting company asset ${assetKey}:`, e);
    return false;
  }
}

