import { prisma } from "@authforge/db";
import { env } from "../../env.js";
import { generateSingleUseToken, hashSingleUseToken } from "../../lib/single-use-token.js";
import { hashPassword } from "../../lib/password.js";
import { HttpError } from "../../middleware/error-handler.js";
import { TRANSACTION_OPTIONS } from "../../lib/transaction.js";
import type { Mailer } from "../../lib/mailer.js";

export async function requestPasswordReset(
  application: { id: string; name: string },
  email: string,
  mailer: Mailer,
): Promise<void> {
  const endUser = await prisma.endUser.findUnique({
    where: { applicationId_email: { applicationId: application.id, email } },
  });
  // Silent no-op for an unknown address. The route answers 202 either way, so
  // this endpoint cannot be used to enumerate registered addresses — and it
  // will be internet-facing once the hosted login page exists.
  if (!endUser) return;

  const { token, tokenHash, expiresAt } = generateSingleUseToken(
    env.PASSWORD_RESET_TOKEN_TTL_SECONDS,
  );
  await prisma.passwordResetToken.create({
    data: { endUserId: endUser.id, tokenHash, expiresAt },
  });
  await mailer.sendPasswordResetEmail({
    to: endUser.email,
    token,
    applicationName: application.name,
  });
}

export async function confirmPasswordReset(
  applicationId: string,
  token: string,
  password: string,
): Promise<void> {
  const tokenHash = hashSingleUseToken(token);
  const now = new Date();
  // Argon2 is deliberately slow; hashing before the transaction opens keeps a
  // database transaction from being held for the duration of that work.
  const passwordHash = await hashPassword(password);

  const changed = await prisma.$transaction(async (tx) => {
    // One atomic statement carrying every invariant: unused, unexpired, and
    // belonging to this tenant. Reading then deciding would let two concurrent
    // requests consume the same token.
    const { count } = await tx.passwordResetToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
        endUser: { applicationId },
      },
      data: { usedAt: now },
    });
    if (count === 0) return false;

    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { endUserId: true },
    });
    if (!record) return false;

    await tx.endUser.update({
      where: { id: record.endUserId },
      data: { passwordHash },
    });

    // Receiving the token proves control of the mailbox, which is exactly what
    // verification asserts. Scoped to the null case so an existing timestamp is
    // not overwritten.
    await tx.endUser.updateMany({
      where: { id: record.endUserId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });

    // Every other outstanding token is another standing way into the account.
    await tx.passwordResetToken.updateMany({
      where: { endUserId: record.endUserId, usedAt: null },
      data: { usedAt: now },
    });

    return true;
  }, TRANSACTION_OPTIONS);

  if (!changed) throw new HttpError(400, "Invalid or expired token");
}
