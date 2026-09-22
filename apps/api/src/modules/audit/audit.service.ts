import { prisma, Prisma } from "@authforge/db";
import type { Request } from "express";

export interface AuditEntry {
  id: string;
  endUserId: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
}

export function extractRequestMeta(req: Request): { ip?: string; userAgent?: string } {
  return {
    ip: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? undefined,
    userAgent: req.headers["user-agent"] ?? undefined,
  };
}

export async function recordAuditEvent(
  applicationId: string,
  action: string,
  opts: {
    endUserId?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      applicationId,
      action,
      endUserId: opts.endUserId ?? null,
      ipAddress: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
      metadata: (opts.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function listAuditLogs(
  applicationId: string,
  opts: { endUserId?: string; limit?: number; before?: string } = {},
): Promise<AuditEntry[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const where: Record<string, unknown> = { applicationId };
  if (opts.endUserId) where.endUserId = opts.endUserId;
  if (opts.before) where.createdAt = { lt: new Date(opts.before) };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((l) => ({
    id: l.id,
    endUserId: l.endUserId,
    action: l.action,
    ipAddress: l.ipAddress,
    userAgent: l.userAgent,
    metadata: l.metadata,
    createdAt: l.createdAt,
  }));
}
