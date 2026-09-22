import { Router } from "express";
import { z } from "zod";
import { prisma } from "@authforge/db";
import { verifyPassword, getDecoyPasswordHash } from "../../lib/password.js";
import { issueAuthorizationCode } from "./oauth.service.js";
import { HttpError } from "../../middleware/error-handler.js";

const callbackSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().min(1),
  code_challenge: z.string().min(43).max(128),
  scope: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(1),
});

export function createOAuthCallbackRouter(): Router {
  const router = Router();

  router.post("/oauth/callback", async (req, res, next) => {
    try {
      const parsed = callbackSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid request");

      const application = await prisma.application.findUnique({
        where: { clientId: parsed.data.client_id },
      });
      if (!application) throw new HttpError(400, "Unknown client_id");
      if (!application.redirectUris.includes(parsed.data.redirect_uri)) {
        throw new HttpError(400, "Invalid redirect_uri");
      }

      const endUser = await prisma.endUser.findUnique({
        where: {
          applicationId_email: {
            applicationId: application.id,
            email: parsed.data.email,
          },
        },
      });

      if (!endUser) {
        await verifyPassword(await getDecoyPasswordHash(), parsed.data.password);
        throw new HttpError(401, "Invalid credentials");
      }

      const ok = await verifyPassword(endUser.passwordHash, parsed.data.password);
      if (!ok) throw new HttpError(401, "Invalid credentials");

      if (application.requireVerifiedEmail && endUser.emailVerifiedAt === null) {
        throw new HttpError(403, "Email not verified", "email_not_verified");
      }

      const code = await issueAuthorizationCode(
        application.id,
        endUser.id,
        parsed.data.redirect_uri,
        parsed.data.code_challenge,
        parsed.data.scope ?? "",
      );

      const redirectUrl = new URL(parsed.data.redirect_uri);
      redirectUrl.searchParams.set("code", code);
      redirectUrl.searchParams.set("state", parsed.data.state);

      res.status(200).json({ redirect_uri: redirectUrl.toString() });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
