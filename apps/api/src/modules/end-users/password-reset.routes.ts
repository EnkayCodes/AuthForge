import { Router } from "express";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { HttpError } from "../../middleware/error-handler.js";
import type { Mailer } from "../../lib/mailer.js";
import {
  confirmPasswordResetSchema,
  requestPasswordResetSchema,
} from "./password-reset.schema.js";
import { confirmPasswordReset, requestPasswordReset } from "./password-reset.service.js";
import { passwordResetRateLimit } from "../../middleware/rate-limit.js";

export function createPasswordResetRouter(mailer: Mailer): Router {
  const router = Router();

  router.post("/users/password-reset", passwordResetRateLimit, requireApiKey, async (req, res, next) => {
    try {
      const application = req.application;
      if (!application) throw new HttpError(401, "Unauthorized");
      const parsed = requestPasswordResetSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid payload");
      await requestPasswordReset(application, parsed.data.email, mailer);
      res.status(202).json({ accepted: true });
    } catch (err) {
      next(err);
    }
  });

  router.post("/users/password-reset/confirm", requireApiKey, async (req, res, next) => {
    try {
      const application = req.application;
      if (!application) throw new HttpError(401, "Unauthorized");
      const parsed = confirmPasswordResetSchema.safeParse(req.body);
      // The same response a valid-looking but unusable token gets, so a
      // malformed value is not distinguishable from a rejected one.
      if (!parsed.success) throw new HttpError(400, "Invalid or expired token");
      await confirmPasswordReset(application.id, parsed.data.token, parsed.data.password);
      res.status(200).json({ reset: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
