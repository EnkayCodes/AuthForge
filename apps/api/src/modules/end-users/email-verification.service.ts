import { prisma } from "@authforge/db";
import { env } from "../../env.js";
import { generateSingleUseToken } from "../../lib/single-use-token.js";
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
