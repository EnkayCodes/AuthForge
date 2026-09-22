import { Router } from "express";
import { authorizeQuerySchema, tokenBodySchema } from "./oauth.schema.js";
import { validateAuthorizeRequest, exchangeAuthorizationCode } from "./oauth.service.js";
import { HttpError } from "../../middleware/error-handler.js";
import { env } from "../../env.js";

export function createOAuthRouter(): Router {
  const router = Router();

  router.get("/authorize", async (req, res, next) => {
    try {
      const parsed = authorizeQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new HttpError(400, "Invalid authorization request");
      }

      const application = await validateAuthorizeRequest({
        clientId: parsed.data.client_id,
        redirectUri: parsed.data.redirect_uri,
        state: parsed.data.state,
        codeChallenge: parsed.data.code_challenge,
        codeChallengeMethod: parsed.data.code_challenge_method,
        scope: parsed.data.scope,
      });

      const loginUrl = new URL(`${env.LOGIN_BASE_URL}/login`);
      loginUrl.searchParams.set("client_id", application.clientId);
      loginUrl.searchParams.set("redirect_uri", parsed.data.redirect_uri);
      loginUrl.searchParams.set("state", parsed.data.state);
      loginUrl.searchParams.set("code_challenge", parsed.data.code_challenge);
      loginUrl.searchParams.set("scope", parsed.data.scope ?? "");

      res.redirect(loginUrl.toString());
    } catch (err) {
      next(err);
    }
  });

  router.post("/token", async (req, res, next) => {
    try {
      const parsed = tokenBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_request" });
        return;
      }

      const result = await exchangeAuthorizationCode(
        parsed.data.client_id,
        parsed.data.code,
        parsed.data.redirect_uri,
        parsed.data.code_verifier,
      );

      res.setHeader("Cache-Control", "no-store");
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError && err.status === 400) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  return router;
}
