import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { HttpError } from "../../middleware/error-handler.js";
import { validateMfaCode } from "./mfa.service.js";
import { signAccessToken } from "../../lib/jwks.js";
import { parseRefreshTokenTtl } from "../../lib/ttl.js";
import { issueRefreshToken } from "../end-users/refresh-token.service.js";
import { getUserPermissions } from "../rbac/rbac.service.js";
import { env } from "../../env.js";
import { prisma } from "@authforge/db";
import { recordAuditEvent, extractRequestMeta } from "../audit/audit.service.js";

const challengeSchema = z.object({
  mfa_token: z.string().min(1),
  code: z.string().min(1),
});

export function createMfaChallengeRouter(): Router {
  const router = Router();

  router.post("/users/mfa/challenge", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");

      const parsed = challengeSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid payload");

      let payload: jwt.JwtPayload;
      try {
        const decoded = jwt.verify(parsed.data.mfa_token, env.SESSION_JWT_SECRET);
        if (typeof decoded === "string") throw new Error();
        payload = decoded;
      } catch {
        throw new HttpError(401, "Invalid or expired MFA token");
      }

      if (payload.purpose !== "mfa_challenge" || !payload.sub) {
        throw new HttpError(401, "Invalid MFA token");
      }

      const meta = extractRequestMeta(req);
      const ok = await validateMfaCode(payload.sub, parsed.data.code);
      if (!ok) {
        await recordAuditEvent(app.id, "user.mfa_failed", { endUserId: payload.sub, ...meta });
        throw new HttpError(401, "Invalid MFA code");
      }

      const endUser = await prisma.endUser.findUnique({
        where: { id: payload.sub },
      });
      if (!endUser) throw new HttpError(401, "User not found");

      const permissions = await getUserPermissions(endUser.id);
      const accessToken = signAccessToken(
        {
          sub: endUser.id,
          email: endUser.email,
          email_verified: endUser.emailVerifiedAt !== null,
          aud: app.clientId,
          permissions,
        },
        app.accessTokenTtl,
      );

      const ttlSeconds = parseRefreshTokenTtl(app.refreshTokenTtl);
      const { token: refreshToken } = await issueRefreshToken(endUser.id, ttlSeconds);

      await recordAuditEvent(app.id, "user.mfa_verified", { endUserId: endUser.id, ...meta });
      res.json({
        endUser: {
          id: endUser.id,
          email: endUser.email,
          emailVerified: endUser.emailVerifiedAt !== null,
          createdAt: endUser.createdAt,
        },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
