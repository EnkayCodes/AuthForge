import type { NextFunction, Request, Response } from "express";
import { prisma } from "@authforge/db";
import { HttpError } from "./error-handler.js";
import type { AuthenticatedApplication } from "./require-api-key.js";

export async function requireDeveloperApp(req: Request, _res: Response, next: NextFunction) {
  try {
    const developer = req.developer;
    if (!developer) throw new HttpError(401, "Unauthorized");

    const appId = req.params.appId;
    if (!appId) throw new HttpError(400, "Missing application ID");

    const application = await prisma.application.findFirst({
      where: { id: appId, developerId: developer.id },
    });

    if (!application) throw new HttpError(404, "Application not found");

    req.application = {
      id: application.id,
      name: application.name,
      environment: application.environment,
      clientId: application.clientId,
      requireVerifiedEmail: application.requireVerifiedEmail,
      accessTokenTtl: application.accessTokenTtl,
      refreshTokenTtl: application.refreshTokenTtl,
    } satisfies AuthenticatedApplication;

    next();
  } catch (err) {
    next(err);
  }
}
