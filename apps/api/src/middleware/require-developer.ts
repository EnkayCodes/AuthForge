import type { NextFunction, Request, Response } from "express";
import { prisma } from "@authforge/db";
import { verifySessionToken } from "../lib/session-token.js";
import { HttpError } from "./error-handler.js";
import { toPublicDeveloper } from "../modules/developers/developer.service.js";
import type { PublicDeveloper } from "../modules/developers/developer.service.js";

declare global {
  namespace Express {
    interface Request {
      developer?: PublicDeveloper;
    }
  }
}

export async function requireDeveloper(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const payload = verifySessionToken(token);
    if (!payload) throw new HttpError(401, "Unauthorized");

    const developer = await prisma.developer.findUnique({
      where: { id: payload.developerId },
    });
    if (!developer) throw new HttpError(401, "Unauthorized");

    req.developer = toPublicDeveloper(developer);
    next();
  } catch (err) {
    next(err);
  }
}
