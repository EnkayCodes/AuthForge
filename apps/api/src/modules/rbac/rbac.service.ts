import { prisma } from "@authforge/db";
import { HttpError } from "../../middleware/error-handler.js";

export async function createRole(applicationId: string, name: string, description: string) {
  try {
    return await prisma.role.create({
      data: { applicationId, name, description },
    });
  } catch {
    throw new HttpError(409, "Role already exists");
  }
}

export async function listRoles(applicationId: string) {
  return prisma.role.findMany({
    where: { applicationId },
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });
}

export async function deleteRole(applicationId: string, roleId: string) {
  const { count } = await prisma.role.deleteMany({
    where: { id: roleId, applicationId },
  });
  if (count === 0) throw new HttpError(404, "Role not found");
}

export async function createPermission(applicationId: string, key: string, description: string) {
  try {
    return await prisma.permission.create({
      data: { applicationId, key, description },
    });
  } catch {
    throw new HttpError(409, "Permission already exists");
  }
}

export async function listPermissions(applicationId: string) {
  return prisma.permission.findMany({
    where: { applicationId },
    orderBy: { key: "asc" },
  });
}

export async function deletePermission(applicationId: string, permissionId: string) {
  const { count } = await prisma.permission.deleteMany({
    where: { id: permissionId, applicationId },
  });
  if (count === 0) throw new HttpError(404, "Permission not found");
}

export async function attachPermissionToRole(roleId: string, permissionId: string) {
  try {
    await prisma.rolePermission.create({
      data: { roleId, permissionId },
    });
  } catch {
    throw new HttpError(409, "Permission already attached to role");
  }
}

export async function detachPermissionFromRole(roleId: string, permissionId: string) {
  const { count } = await prisma.rolePermission.deleteMany({
    where: { roleId, permissionId },
  });
  if (count === 0) throw new HttpError(404, "Permission not attached to role");
}

export async function assignRoleToUser(endUserId: string, roleId: string) {
  try {
    await prisma.userRole.create({
      data: { endUserId, roleId },
    });
  } catch {
    throw new HttpError(409, "Role already assigned to user");
  }
}

export async function removeRoleFromUser(endUserId: string, roleId: string) {
  const { count } = await prisma.userRole.deleteMany({
    where: { endUserId, roleId },
  });
  if (count === 0) throw new HttpError(404, "Role not assigned to user");
}

export async function getUserPermissions(endUserId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { endUserId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissions = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.key);
    }
  }
  return [...permissions].sort();
}

export async function getUserRoles(endUserId: string) {
  return prisma.userRole.findMany({
    where: { endUserId },
    include: { role: true },
  });
}
