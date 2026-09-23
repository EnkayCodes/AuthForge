import { prisma } from "@authforge/db";

export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: Date;
  createdAt: Date;
}

export async function createSession(
  endUserId: string,
  familyId: string,
  meta: { ip?: string; userAgent?: string },
): Promise<SessionInfo> {
  const session = await prisma.session.create({
    data: {
      endUserId,
      familyId,
      ipAddress: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  return toSessionInfo(session);
}

export async function listActiveSessions(endUserId: string): Promise<SessionInfo[]> {
  const sessions = await prisma.session.findMany({
    where: { endUserId, revokedAt: null },
    orderBy: { lastActiveAt: "desc" },
  });
  return sessions.map(toSessionInfo);
}

export async function revokeSession(sessionId: string, endUserId: string): Promise<void> {
  const now = new Date();
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.endUserId !== endUserId || session.revokedAt) return;

  await prisma.$transaction([
    prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: now },
    }),
    prisma.refreshToken.updateMany({
      where: { familyId: session.familyId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);
}

export async function revokeAllSessions(endUserId: string): Promise<number> {
  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: { endUserId, revokedAt: null },
  });
  if (sessions.length === 0) return 0;

  const familyIds = sessions.map((s) => s.familyId);
  await prisma.$transaction([
    prisma.session.updateMany({
      where: { endUserId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.refreshToken.updateMany({
      where: { familyId: { in: familyIds }, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);
  return sessions.length;
}

export async function touchSession(familyId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { familyId, revokedAt: null },
    data: { lastActiveAt: new Date() },
  });
}

function toSessionInfo(session: {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: Date;
  createdAt: Date;
}): SessionInfo {
  return {
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    lastActiveAt: session.lastActiveAt,
    createdAt: session.createdAt,
  };
}
