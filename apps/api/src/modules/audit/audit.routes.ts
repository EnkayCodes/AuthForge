import { Router } from "express";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { HttpError } from "../../middleware/error-handler.js";
import { listAuditLogs } from "./audit.service.js";

export function createAuditRouter(): Router {
  const router = Router();

  router.get("/audit/logs", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");

      const logs = await listAuditLogs(app.id, {
        endUserId: req.query.user_id as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        before: req.query.before as string | undefined,
      });
      res.json({ logs });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
