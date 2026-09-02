import { prisma } from "@authforge/db";
import { env } from "../../env.js";
import { generateSingleUseToken, hashSingleUseToken } from "../../lib/single-use-token.js";
import { HttpError } from "../../middleware/error-handler.js";
import { TRANSACTION_OPTIONS } from "../../lib/transaction.js";
import type { Mailer } from "../../lib/mailer.js";

// Only the hash is stored. A database dump therefore yields nothing usable:
// the plaintext exists solely in the delivered message.
export async function issueVerificationToken(
  endUser: { id: string; email: string },
  applicationName: string,
  mailer: Mailer,
): Promise<void> {
  const { token, tokenHash, expiresAt } = generateSingleUseToken(
    env.VERIFICATION_TOKEN_TTL_SECONDS,
  );
  await prisma.verificationToken.create({
    data: { endUserId: endUser.id, tokenHash, expiresAt },
  });
  await mailer.sendVerificationEmail({ to: endUser.email, token, applicationName });
}

export async function confirmEmailVerification(
  applicationId: string,
  token: string,
): Promise<void> {
  const tokenHash = hashSingleUseToken(token);
  const now = new Date();

  // Consumption and the resulting state change belong in one transaction: a
  // failure between them would burn the token without verifying the address.
  // The default 5s interactive-transaction budget assumes a local database;
  // these statements cross a pooler to a remote region, so it is raised rather
  // than the transaction being dropped for something weaker.
  const endUserId = await prisma.$transaction(async (tx) => {
    // One atomic statement encodes every invariant: the token exists, is
    // unused, is unexpired, and belongs to this tenant. Reading first and
    // deciding afterwards would leave a window in which two concurrent
    // requests both consume the same token.
    const { count } = await tx.verificationToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
        endUser: { applicationId },
      },
      data: { usedAt: now },
    });
    if (count === 0) return null;

    const record = await tx.verificationToken.findUnique({
      where: { tokenHash },
      select: { endUserId: true },
    });
    if (!record) return null;

    await tx.endUser.update({
      where: { id: record.endUserId },
      data: { emailVerifiedAt: now },
    });
    return record.endUserId;
  }, TRANSACTION_OPTIONS);

  // Invalid, expired, already used, and belonging-to-another-tenant all produce
  // the same response, so none of them is distinguishable from the others.
  if (endUserId === null) throw new HttpError(400, "Invalid or expired token");
}

export async function resendVerification(
  application: { id: string; name: string },
  email: string,
  mailer: Mailer,
): Promise<void> {
  const endUser = await prisma.endUser.findUnique({
    where: { applicationId_email: { applicationId: application.id, email } },
  });
  // Silent no-op for an unknown or already-verified address: the route answers
  // 202 either way, so this endpoint cannot be used to test whether an address
  // is registered.
  if (!endUser || endUser.emailVerifiedAt !== null) return;
  await issueVerificationToken(endUser, application.name, mailer);
}
