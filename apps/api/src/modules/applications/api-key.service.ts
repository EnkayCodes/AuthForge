import { prisma } from "@authforge/db";
import { generateApiKey } from "../../lib/api-key.js";
import { getApplication } from "./application.service.js";

export interface PublicApiKey {
  id: string;
  keyId: string;
  label: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

// Deliberately omits secretHash. The secret itself is returned only by
// issueApiKey, at creation time, and is never persisted in plaintext.
export function toPublicApiKey(apiKey: {
  id: string;
  keyId: string;
  label: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): PublicApiKey {
  return {
    id: apiKey.id,
    keyId: apiKey.keyId,
    label: apiKey.label,
    lastUsedAt: apiKey.lastUsedAt,
    revokedAt: apiKey.revokedAt,
    createdAt: apiKey.createdAt,
  };
}

export async function issueApiKey(
  developerId: string,
  applicationId: string,
  label: string,
): Promise<{ apiKey: PublicApiKey; token: string }> {
  // Throws 404 when the application is missing or owned by someone else.
  const application = await getApplication(developerId, applicationId);

  const generated = generateApiKey(application.environment);

  const created = await prisma.apiKey.create({
    data: {
      applicationId,
      keyId: generated.keyId,
      secretHash: generated.secretHash,
      label,
    },
  });

  return { apiKey: toPublicApiKey(created), token: generated.token };
}
