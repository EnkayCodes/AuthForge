import { Router } from "express";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { HttpError } from "../../middleware/error-handler.js";
import type { Mailer } from "../../lib/mailer.js";
import { loginEndUserSchema, registerEndUserSchema } from "./end-user.schema.js";
import { authenticateEndUser, registerEndUser } from "./end-user.service.js";

// A factory rather than a module-level singleton, because the router needs the
// injected mailer. The application always comes from the authenticated API key,
// never from the request body, so a caller cannot address another tenant.
export function createEndUserRouter(mailer: Mailer): Router {
  const router = Router();

  router.post("/users/register", requireApiKey, async (req, res, next) => {
    try {
      const application = req.application;
      if (!application) throw new HttpError(401, "Unauthorized");
      const parsed = registerEndUserSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid registration payload");
      const endUser = await registerEndUser(application, parsed.data, mailer);
      res.status(201).json({ endUser });
    } catch (err) {
      next(err);
    }
  });

  router.post("/users/login", requireApiKey, async (req, res, next) => {
    try {
      const application = req.application;
      if (!application) throw new HttpError(401, "Unauthorized");
      const parsed = loginEndUserSchema.safeParse(req.body);
      // 401 rather than 400: a malformed payload must not be distinguishable
      // from a rejected credential, or payload shape becomes a probe.
      if (!parsed.success) throw new HttpError(401, "Invalid credentials");
      const endUser = await authenticateEndUser(application, parsed.data);
      res.status(200).json({ endUser });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
