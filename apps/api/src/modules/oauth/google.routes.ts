import { Router, type Router as RouterType } from "express";
import { z } from "zod";
import { env } from "../../env.js";
import { HttpError } from "../../middleware/error-handler.js";
import { buildGoogleAuthUrl, handleGoogleCallback } from "./google.service.js";

const initiateSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().min(1),
  code_challenge: z.string().min(43).max(128),
  scope: z.string().optional(),
});

export function createGoogleOAuthRouter(): RouterType {
  const router: RouterType = Router();

  router.get("/oauth/google", (req, res, next) => {
    try {
      const parsed = initiateSchema.safeParse(req.query);
      if (!parsed.success) throw new HttpError(400, "Invalid request");

      const protocol = req.headers["x-forwarded-proto"] ?? req.protocol;
      const callbackUrl = `${protocol}://${req.get("host")}/oauth/google/callback`;

      const url = buildGoogleAuthUrl(
        {
          clientId: parsed.data.client_id,
          redirectUri: parsed.data.redirect_uri,
          state: parsed.data.state,
          codeChallenge: parsed.data.code_challenge,
          scope: parsed.data.scope ?? "",
        },
        callbackUrl,
      );

      res.redirect(url);
    } catch (err) {
      next(err);
    }
  });

  router.get("/oauth/google/callback", async (req, res, next) => {
    try {
      const { code, state, error } = req.query;

      if (error || !code || !state) {
        const loginUrl = new URL(`${env.LOGIN_BASE_URL}/login`);
        loginUrl.searchParams.set("error", "google_auth_failed");
        res.redirect(loginUrl.toString());
        return;
      }

      const protocol = req.headers["x-forwarded-proto"] ?? req.protocol;
      const callbackUrl = `${protocol}://${req.get("host")}/oauth/google/callback`;

      const redirectUri = await handleGoogleCallback(
        code as string,
        state as string,
        callbackUrl,
      );

      res.redirect(redirectUri);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
