import { Router } from "express";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { HttpError } from "../../middleware/error-handler.js";
import { listActiveSessions, revokeSession, revokeAllSessions } from "./session.service.js";
import { recordAuditEvent, extractRequestMeta } from "../audit/audit.service.js";

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
      const meta = extractRequestMeta(req);
      await recordAuditEvent(app.id, "session.revoked", { endUserId: req.params.userId, ...meta, metadata: { sessionId: req.params.sessionId } });
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
      const meta = extractRequestMeta(req);
      await recordAuditEvent(app.id, "session.revoked_all", { endUserId: req.params.userId, ...meta, metadata: { count } });
      res.json({ revoked: count });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
