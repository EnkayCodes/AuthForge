import { Router } from "express";
import { z } from "zod";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { HttpError } from "../../middleware/error-handler.js";
import { enrollTotp, verifyTotp, disableTotp } from "./mfa.service.js";
import { prisma } from "@authforge/db";

const verifySchema = z.object({ code: z.string().length(6) });

export function createMfaRouter(): Router {
  const router = Router();

  router.post("/users/:userId/mfa/totp/enroll", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");

      const endUser = await prisma.endUser.findFirst({
        where: { id: req.params.userId, applicationId: app.id },
      });
      if (!endUser) throw new HttpError(404, "User not found");

      const result = await enrollTotp(endUser.id, endUser.email, app.name);
      res.json({ secret: result.secret, uri: result.uri });
    } catch (err) {
      next(err);
    }
  });

  router.post("/users/:userId/mfa/totp/verify", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");

      const endUser = await prisma.endUser.findFirst({
        where: { id: req.params.userId, applicationId: app.id },
      });
      if (!endUser) throw new HttpError(404, "User not found");

      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid code");

      const { recoveryCodes } = await verifyTotp(endUser.id, parsed.data.code);
      res.json({ recoveryCodes });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/users/:userId/mfa/totp", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");

      const endUser = await prisma.endUser.findFirst({
        where: { id: req.params.userId, applicationId: app.id },
      });
      if (!endUser) throw new HttpError(404, "User not found");

      await disableTotp(endUser.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
