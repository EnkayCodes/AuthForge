import type { NextFunction, Request, Response } from "express";
import { prisma } from "@authforge/db";
import { parseApiKeyToken, verifyApiKeySecret } from "../lib/api-key.js";
import { HttpError } from "./error-handler.js";

export interface AuthenticatedApplication {
  id: string;
  name: string;
  environment: string;
  clientId: string;
}

declare global {
  namespace Express {
    interface Request {
      application?: AuthenticatedApplication;
    }
  }
}

export async function requireApiKey(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    const parsed = parseApiKeyToken(token);
    if (!parsed) throw new HttpError(401, "Unauthorized");

    // Look up by the public, indexed key id — never by the secret.
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyId: parsed.keyId },
      include: { application: true },
    });
    if (!apiKey || apiKey.revokedAt) throw new HttpError(401, "Unauthorized");
    if (!verifyApiKeySecret(apiKey.secretHash, parsed.secret)) {
      throw new HttpError(401, "Unauthorized");
    }
    if (!apiKey.application) throw new HttpError(401, "Unauthorized");

    // Best effort: usage tracking must never fail an authenticated request.
    await prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    req.application = {
      id: apiKey.application.id,
      name: apiKey.application.name,
      environment: apiKey.application.environment,
      clientId: apiKey.application.clientId,
    };
    next();
  } catch (err) {
    next(err);
  }
}
