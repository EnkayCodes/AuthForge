import { Router } from "express";
import { requireApiKey } from "../../middleware/require-api-key.js";
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

export function createRbacRouter(): Router {
  const router = Router();

  router.post("/roles", requireApiKey, async (req, res, next) => {
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

  router.get("/roles", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const roles = await listRoles(app.id);
      res.json({ roles });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/roles/:roleId", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      await deleteRole(app.id, req.params.roleId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.post("/roles/:roleId/permissions", requireApiKey, async (req, res, next) => {
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

  router.delete("/roles/:roleId/permissions/:permissionId", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      await detachPermissionFromRole(req.params.roleId, req.params.permissionId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.post("/permissions", requireApiKey, async (req, res, next) => {
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

  router.get("/permissions", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      const permissions = await listPermissions(app.id);
      res.json({ permissions });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/permissions/:permissionId", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      await deletePermission(app.id, req.params.permissionId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.post("/users/:userId/roles", requireApiKey, async (req, res, next) => {
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

  router.delete("/users/:userId/roles/:roleId", requireApiKey, async (req, res, next) => {
    try {
      const app = req.application;
      if (!app) throw new HttpError(401, "Unauthorized");
      await removeRoleFromUser(req.params.userId, req.params.roleId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.get("/users/:userId/roles", requireApiKey, async (req, res, next) => {
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
