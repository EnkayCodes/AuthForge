import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@authforge/db";
import { verifyPassword, getDecoyPasswordHash, hashPassword } from "../../lib/password.js";
import { issueAuthorizationCode } from "./oauth.service.js";
import { issueVerificationToken } from "../end-users/email-verification.service.js";
import { requestPasswordReset, confirmPasswordReset } from "../end-users/password-reset.service.js";
import { HttpError } from "../../middleware/error-handler.js";
import type { Mailer } from "../../lib/mailer.js";

const callbackSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().min(1),
  code_challenge: z.string().min(43).max(128),
  scope: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(1),
});

const signupSchema = z.object({
  client_id: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const forgotPasswordSchema = z.object({
  client_id: z.string().min(1),
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  client_id: z.string().min(1),
  token: z.string().min(1),
  password: z.string().min(8),
});

export function createOAuthCallbackRouter(mailer: Mailer): Router {
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

      if (!endUser.passwordHash) {
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

  router.post("/oauth/signup", async (req, res, next) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid request");

      const application = await prisma.application.findUnique({
        where: { clientId: parsed.data.client_id },
      });
      if (!application) throw new HttpError(400, "Unknown client_id");

      let endUser;
      try {
        endUser = await prisma.endUser.create({
          data: {
            applicationId: application.id,
            email: parsed.data.email,
            passwordHash: await hashPassword(parsed.data.password),
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw new HttpError(409, "Email already registered");
        }
        throw err;
      }

      await issueVerificationToken(endUser, application.name, mailer);
      res.status(201).json({ message: "Account created. Check your email to verify." });
    } catch (err) {
      next(err);
    }
  });

  router.post("/oauth/forgot-password", async (req, res, next) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid request");

      const application = await prisma.application.findUnique({
        where: { clientId: parsed.data.client_id },
      });
      if (!application) throw new HttpError(400, "Unknown client_id");

      await requestPasswordReset(application, parsed.data.email, mailer);
      res.status(202).json({ accepted: true });
    } catch (err) {
      next(err);
    }
  });

  router.post("/oauth/reset-password", async (req, res, next) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid request");

      const application = await prisma.application.findUnique({
        where: { clientId: parsed.data.client_id },
      });
      if (!application) throw new HttpError(400, "Unknown client_id");

      await confirmPasswordReset(application.id, parsed.data.token, parsed.data.password);
      res.status(200).json({ reset: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
