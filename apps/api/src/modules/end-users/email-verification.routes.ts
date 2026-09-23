import { Router } from "express";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { HttpError } from "../../middleware/error-handler.js";
import type { Mailer } from "../../lib/mailer.js";
import {
  confirmVerificationSchema,
  resendVerificationSchema,
} from "./email-verification.schema.js";
import { confirmEmailVerification, resendVerification } from "./email-verification.service.js";

export function createEmailVerificationRouter(mailer: Mailer): Router {
  const router = Router();

  router.post("/users/verify-email", requireApiKey, async (req, res, next) => {
    try {
      const application = req.application;
      if (!application) throw new HttpError(401, "Unauthorized");
      const parsed = confirmVerificationSchema.safeParse(req.body);
      // The same response as a token that parses but cannot be used, so a
      // malformed value is not distinguishable from a rejected one.
      if (!parsed.success) throw new HttpError(400, "Invalid or expired token");
      await confirmEmailVerification(application.id, parsed.data.token);
      res.status(200).json({ verified: true });
    } catch (err) {
      next(err);
    }
  });

  router.post("/users/verify-email/resend", requireApiKey, async (req, res, next) => {
    try {
      const application = req.application;
      if (!application) throw new HttpError(401, "Unauthorized");
      const parsed = resendVerificationSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid payload");
      await resendVerification(application, parsed.data.email, mailer);
      res.status(202).json({ accepted: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
