import { prisma } from "@authforge/db";
import { randomUUID } from "node:crypto";
import { generateSingleUseToken, hashSingleUseToken } from "../../lib/single-use-token.js";
import { signAccessToken } from "../../lib/jwks.js";
import { HttpError } from "../../middleware/error-handler.js";
import { TRANSACTION_OPTIONS } from "../../lib/transaction.js";
import { toPublicEndUser } from "./end-user.service.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function issueRefreshToken(
  endUserId: string,
  refreshTokenTtlSeconds: number,
  familyId?: string,
): Promise<{ token: string }> {
  const { token, tokenHash, expiresAt } = generateSingleUseToken(refreshTokenTtlSeconds);
  await prisma.refreshToken.create({
    data: {
      endUserId,
      tokenHash,
      familyId: familyId ?? randomUUID(),
      expiresAt,
    },
  });
  return { token };
}

export async function rotateRefreshToken(
  applicationId: string,
  clientId: string,
  accessTokenTtl: string,
  refreshTokenTtlSeconds: number,
  token: string,
): Promise<TokenPair> {
  const tokenHash = hashSingleUseToken(token);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.refreshToken.findUnique({
      where: { tokenHash },
      include: { endUser: true },
    });

    if (!existing) throw new HttpError(401, "Invalid refresh token");
    if (existing.endUser.applicationId !== applicationId) {
      throw new HttpError(401, "Invalid refresh token");
    }

    // Reuse detection: a token that was already consumed is being replayed.
    // Revoke the entire family — the legitimate holder and the attacker both
    // lose access, which is the only safe response.
    if (existing.usedAt || existing.revokedAt) {
      await tx.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      throw new HttpError(401, "Token reuse detected");
    }

    if (existing.expiresAt <= now) {
      throw new HttpError(401, "Refresh token expired");
    }

    // Mark the current token as used.
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { usedAt: now },
    });

    // Issue a new refresh token in the same family.
    const { token: newRawToken, tokenHash: newHash, expiresAt } = generateSingleUseToken(refreshTokenTtlSeconds);
    await tx.refreshToken.create({
      data: {
        endUserId: existing.endUserId,
        tokenHash: newHash,
        familyId: existing.familyId,
        expiresAt,
      },
    });

    const pub = toPublicEndUser(existing.endUser);
    const accessToken = signAccessToken(
      {
        sub: pub.id,
        email: pub.email,
        email_verified: pub.emailVerified,
        aud: clientId,
      },
      accessTokenTtl,
    );

    return { accessToken, refreshToken: newRawToken };
  }, TRANSACTION_OPTIONS);
}
