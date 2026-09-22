import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(256).default(""),
});

export const createPermissionSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z][a-z0-9_.:-]*$/, "must be lowercase with dots/colons/hyphens"),
  description: z.string().max(256).default(""),
});

export const attachPermissionSchema = z.object({
  permissionId: z.string().min(1),
});

export const assignRoleSchema = z.object({
  roleId: z.string().min(1),
});
