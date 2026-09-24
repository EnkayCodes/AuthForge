import { Router } from "express";
import { requireDeveloper } from "../../middleware/require-developer.js";
import { requireDeveloperApp } from "../../middleware/require-developer-app.js";
import { HttpError } from "../../middleware/error-handler.js";
import { listAuditLogs } from "./audit.service.js";

export function createDashboardAuditRouter(): Router {
  const router = Router();

  router.get("/applications/:appId/audit/logs", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
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
