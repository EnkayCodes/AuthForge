import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwks.js";
import { getUserPermissions } from "../modules/rbac/rbac.service.js";
import { HttpError } from "./error-handler.js";

export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        throw new HttpError(401, "Missing access token");
      }

      const token = authHeader.slice(7);
      const payload = verifyAccessToken(token);
      if (!payload || typeof payload === "string") {
        throw new HttpError(401, "Invalid access token");
      }

      const sub = payload.sub;
      if (!sub) throw new HttpError(401, "Invalid access token");

      const userPermissions = await getUserPermissions(sub);

      for (const required of requiredPermissions) {
        if (!userPermissions.includes(required)) {
          throw new HttpError(403, `Missing permission: ${required}`);
        }
      }

      (req as Request & { endUserId: string }).endUserId = sub;
      next();
    } catch (err) {
      next(err);
    }
  };
}
