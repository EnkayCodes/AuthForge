import { prisma, Prisma } from "@authforge/db";
import { generateApiKey } from "../../lib/api-key.js";
import { getApplication } from "./application.service.js";
import { HttpError } from "../../middleware/error-handler.js";

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

export async function listApiKeys(
  developerId: string,
  applicationId: string,
): Promise<PublicApiKey[]> {
  await getApplication(developerId, applicationId);
  const keys = await prisma.apiKey.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
  });
  return keys.map(toPublicApiKey);
}

export async function revokeApiKey(
  developerId: string,
  applicationId: string,
  apiKeyId: string,
): Promise<PublicApiKey> {
  await getApplication(developerId, applicationId);

  // One atomic statement. The where clause carries every invariant — the key
  // belongs to this application and is not already revoked — so two concurrent
  // revokes cannot both succeed, and a key from another application cannot be
  // revoked through this one's path.
  try {
    const revoked = await prisma.apiKey.update({
      where: { id: apiKeyId, applicationId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return toPublicApiKey(revoked);
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2025") {
      throw err;
    }
    // The update matched nothing. Only reachable once the ownership gate has
    // already passed, so telling these two apart is not an enumeration oracle.
    const existing = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, applicationId },
    });
    if (!existing) throw new HttpError(404, "Api key not found");
    throw new HttpError(409, "Api key already revoked");
  }
}
