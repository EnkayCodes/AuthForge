import { randomBytes } from "node:crypto";
import { prisma } from "@authforge/db";
import { HttpError } from "../../middleware/error-handler.js";

export interface PublicApplication {
  id: string;
  name: string;
  environment: string;
  clientId: string;
  redirectUris: string[];
  accessTokenTtl: string;
  refreshTokenTtl: string;
  createdAt: Date;
}

// The single place an Application row becomes client-visible, so a column added
// later cannot leak by default and there is one place to audit.
export function toPublicApplication(application: {
  id: string;
  name: string;
  environment: string;
  clientId: string;
  redirectUris: string[];
  accessTokenTtl: string;
  refreshTokenTtl: string;
  createdAt: Date;
}): PublicApplication {
  return {
    id: application.id,
    name: application.name,
    environment: application.environment,
    clientId: application.clientId,
    redirectUris: application.redirectUris,
    accessTokenTtl: application.accessTokenTtl,
    refreshTokenTtl: application.refreshTokenTtl,
    createdAt: application.createdAt,
  };
}

export async function createApplication(
  developerId: string,
  input: {
    name: string;
    environment?: "development" | "staging" | "production";
    redirectUris?: string[];
  },
): Promise<PublicApplication> {
  const application = await prisma.application.create({
    data: {
      developerId,
      name: input.name,
      environment: input.environment ?? "development",
      redirectUris: input.redirectUris ?? [],
      clientId: `app_${randomBytes(16).toString("hex")}`,
    },
  });
  return toPublicApplication(application);
}

export async function listApplications(developerId: string): Promise<PublicApplication[]> {
  const applications = await prisma.application.findMany({
    where: { developerId },
    orderBy: { createdAt: "desc" },
  });
  return applications.map(toPublicApplication);
}

// The ownership filter lives in the query so another developer's application is
// indistinguishable from one that does not exist.
export async function getApplication(
  developerId: string,
  applicationId: string,
): Promise<PublicApplication> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, developerId },
  });
  if (!application) throw new HttpError(404, "Application not found");
  return toPublicApplication(application);
}
