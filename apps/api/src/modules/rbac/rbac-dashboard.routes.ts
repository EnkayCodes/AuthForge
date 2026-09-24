import { Router } from "express";
import { requireDeveloper } from "../../middleware/require-developer.js";
import { requireDeveloperApp } from "../../middleware/require-developer-app.js";
import { HttpError } from "../../middleware/error-handler.js";
import {
  createRoleSchema,
  createPermissionSchema,
  attachPermissionSchema,
  assignRoleSchema,
} from "./rbac.schema.js";
import {
  createRole,
  listRoles,
  deleteRole,
  createPermission,
  listPermissions,
  deletePermission,
  attachPermissionToRole,
  detachPermissionFromRole,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
} from "./rbac.service.js";

export function createDashboardRbacRouter(): Router {
  const router = Router();

  router.post("/applications/:appId/roles", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const parsed = createRoleSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid payload");
      const role = await createRole(app.id, parsed.data.name, parsed.data.description);
      res.status(201).json({ role });
    } catch (err) {
      next(err);
    }
  });

  router.get("/applications/:appId/roles", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const raw = await listRoles(app.id);
      const roles = raw.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.rolePermissions.map((rp) => rp.permission),
        createdAt: r.createdAt,
      }));
      res.json({ roles });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/applications/:appId/roles/:roleId", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      await deleteRole(app.id, req.params.roleId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.post("/applications/:appId/roles/:roleId/permissions", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const parsed = attachPermissionSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid payload");
      await attachPermissionToRole(req.params.roleId, parsed.data.permissionId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.delete("/applications/:appId/roles/:roleId/permissions/:permissionId", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      await detachPermissionFromRole(req.params.roleId, req.params.permissionId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.post("/applications/:appId/permissions", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const parsed = createPermissionSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid payload");
      const permission = await createPermission(app.id, parsed.data.key, parsed.data.description);
      res.status(201).json({ permission });
    } catch (err) {
      next(err);
    }
  });

  router.get("/applications/:appId/permissions", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const permissions = await listPermissions(app.id);
      res.json({ permissions });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/applications/:appId/permissions/:permissionId", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      await deletePermission(app.id, req.params.permissionId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.post("/applications/:appId/users/:userId/roles", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const parsed = assignRoleSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, "Invalid payload");
      await assignRoleToUser(req.params.userId, parsed.data.roleId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.delete("/applications/:appId/users/:userId/roles/:roleId", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      await removeRoleFromUser(req.params.userId, req.params.roleId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.get("/applications/:appId/users/:userId/roles", requireDeveloper, requireDeveloperApp, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const userRoles = await getUserRoles(req.params.userId);
      res.json({ roles: userRoles.map((ur) => ur.role) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
