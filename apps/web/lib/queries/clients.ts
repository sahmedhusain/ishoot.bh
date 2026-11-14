import { randomUUID } from "node:crypto";
import { getContentSnapshot, saveContentDraft } from "@platform/api-client";
import { ClientLogo } from "../types";

function mapClient(raw: any): ClientLogo {
  return {
    id: String(raw?.id ?? ""),
    client_name: raw?.client_name ?? raw?.clientName ?? "",
    logo_svg_url: raw?.logo_svg_url ?? raw?.logoSvgUrl ?? "",
    website_url: (raw?.website_url ?? raw?.websiteUrl) || undefined,
    display_order: Number(raw?.display_order ?? raw?.displayOrder ?? 0),
    is_active: raw?.is_active ?? raw?.isActive ?? true,
    created_at:
      typeof raw?.created_at === "string"
        ? raw.created_at
        : typeof raw?.createdAt === "string"
          ? raw.createdAt
          : new Date().toISOString(),
  };
}

async function readSnapshotClients(onlyActive: boolean): Promise<ClientLogo[]> {
  try {
    const snap = await getContentSnapshot("main");
    const draftClients = Array.isArray(snap?.draft?.clients)
      ? snap.draft.clients
      : [];
    const pubClients = Array.isArray(snap?.published?.clients)
      ? snap.published.clients
      : [];
    const rawList = onlyActive
      ? pubClients.length > 0
        ? pubClients
        : draftClients
      : draftClients.length > 0
        ? draftClients
        : pubClients;

    const list = rawList.map(mapClient);
    const filtered = onlyActive ? list.filter((c) => c.is_active) : list;
    return filtered.sort(
      (a, b) =>
        a.display_order - b.display_order ||
        a.client_name.localeCompare(b.client_name),
    );
  } catch (e) {
    console.error("Failed to fetch clients from CMS snapshot:", e);
    return [];
  }
}

export async function getActiveClientLogos(): Promise<ClientLogo[]> {
  return readSnapshotClients(true);
}

export async function getAllClientLogos(): Promise<ClientLogo[]> {
  return readSnapshotClients(false);
}

export async function createClientLogo(data: {
  client_name: string;
  logo_svg_url: string;
  website_url?: string;
  display_order?: number;
  is_active?: boolean;
}): Promise<ClientLogo> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.clients)
    ? [...currentDraft.clients].map(mapClient)
    : [];

  const created = mapClient({
    id: randomUUID(),
    client_name: data.client_name,
    logo_svg_url: data.logo_svg_url,
    website_url: data.website_url || undefined,
    display_order: data.display_order ?? list.length,
    is_active: data.is_active ?? true,
    created_at: new Date().toISOString(),
  });

  await saveContentDraft("", "main", {
    ...currentDraft,
    clients: [...list, created],
  });
  return created;
}

export async function updateClientLogo(
  id: string,
  data: Partial<Omit<ClientLogo, "id" | "created_at">>,
): Promise<ClientLogo | null> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.clients)
    ? [...currentDraft.clients].map(mapClient)
    : [];

  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const updated = mapClient({
    ...list[idx],
    ...data,
  });
  list[idx] = updated;

  await saveContentDraft("", "main", {
    ...currentDraft,
    clients: list,
  });
  return updated;
}

export async function deleteClientLogo(id: string): Promise<boolean> {
  const snap = await getContentSnapshot("main").catch(() => null);
  const currentDraft = (snap?.draft as Record<string, any>) ?? {};
  const list = Array.isArray(currentDraft.clients)
    ? [...currentDraft.clients].map(mapClient)
    : [];

  const next = list.filter((c) => c.id !== id);
  if (next.length === list.length) return false;

  await saveContentDraft("", "main", {
    ...currentDraft,
    clients: next,
  });
  return true;
}
