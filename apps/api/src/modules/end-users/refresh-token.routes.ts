import { Router } from "express";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { HttpError } from "../../middleware/error-handler.js";
import { refreshTokenSchema } from "./refresh-token.schema.js";
import { rotateRefreshToken } from "./refresh-token.service.js";
import { parseRefreshTokenTtl } from "../../lib/ttl.js";

export function createRefreshTokenRouter(): Router {
  const router = Router();

  router.post("/users/token/refresh", requireApiKey, async (req, res, next) => {
    try {
      const application = req.application;
      if (!application) throw new HttpError(401, "Unauthorized");
      const parsed = refreshTokenSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(401, "Invalid refresh token");

      const ttlSeconds = parseRefreshTokenTtl(application.refreshTokenTtl);
      const result = await rotateRefreshToken(
        application.id,
        application.clientId,
        application.accessTokenTtl,
        ttlSeconds,
        parsed.data.refreshToken,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
