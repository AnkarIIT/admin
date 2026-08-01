import prisma from "./prisma";

export const INTEGRATION_ROW_ID = "integrations";

export interface IntegrationDef {
  id: string;
  type: string;
  name: string;
  description: string;
  developerNote: string;
}

// Registry of services the admin can enable/disable.
// Actual gateway wiring (API keys, webhooks) is owned by the developer
// (env vars / storefront code) — the admin only toggles a service on/off.
export const INTEGRATION_REGISTRY: IntegrationDef[] = [
  {
    id: "cashfree",
    type: "payment",
    name: "Cashfree Payments",
    description: "Payment gateway used for checkout on the storefront.",
    developerNote: "API keys & webhook secrets are configured by the developer (env vars / storefront code).",
  },
  {
    id: "tagembed",
    type: "reviews",
    name: "Tagembed",
    description: "Customer reviews & social feed widget for the storefront.",
    developerNote: "Widget ID & API token are configured by the developer (env vars / storefront code).",
  },
];

export type IntegrationStatus = "connected" | "disconnected";

async function readStore(): Promise<Record<string, any>> {
  const row = await prisma.siteConfig.findUnique({ where: { id: INTEGRATION_ROW_ID } });
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.data);
    if (parsed && typeof parsed.integrations === "object" && parsed.integrations !== null) {
      return parsed.integrations;
    }
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(map: Record<string, any>): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { id: INTEGRATION_ROW_ID },
    create: { id: INTEGRATION_ROW_ID, data: JSON.stringify({ integrations: map }), updatedAt: new Date() },
    update: { data: JSON.stringify({ integrations: map }), updatedAt: new Date() },
  });
}

export async function readIntegrationsStore(): Promise<Record<string, any>> {
  return readStore();
}

export async function writeIntegrationsStore(map: Record<string, any>): Promise<void> {
  return writeStore(map);
}

export function buildPublicIntegration(def: IntegrationDef, stored: any) {
  const enabled = stored?.enabled === true;
  return {
    id: def.id,
    type: def.type,
    name: def.name,
    description: def.description,
    developerNote: def.developerNote,
    enabled,
    status: (enabled ? "connected" : "disconnected") as IntegrationStatus,
    updatedAt: stored?.updatedAt || null,
  };
}
