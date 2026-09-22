import { Router } from "express";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { HttpError } from "../../middleware/error-handler.js";
import { listActiveSessions, revokeSession, revokeAllSessions } from "./session.service.js";

export function createSessionRouter(): Router {
  const router = Router();

  router.get("/users/:userId/sessions", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const sessions = await listActiveSessions(req.params.userId);
      res.json({ sessions });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/users/:userId/sessions/:sessionId", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      await revokeSession(req.params.sessionId, req.params.userId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.delete("/users/:userId/sessions", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const count = await revokeAllSessions(req.params.userId);
      res.json({ revoked: count });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
