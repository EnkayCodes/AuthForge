import { prisma, Prisma } from "@authforge/db";
import { hashPassword, verifyPassword, getDecoyPasswordHash } from "../../lib/password.js";
import { HttpError } from "../../middleware/error-handler.js";
import type { Mailer } from "../../lib/mailer.js";
import { issueVerificationToken } from "./email-verification.service.js";

export interface PublicEndUser {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
}

// The single place an EndUser row becomes client-visible, so a column added
// later — a TOTP secret, a recovery code — cannot leak by default.
export function toPublicEndUser(endUser: {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}): PublicEndUser {
  return {
    id: endUser.id,
    email: endUser.email,
    emailVerified: endUser.emailVerifiedAt !== null,
    createdAt: endUser.createdAt,
  };
}

export async function registerEndUser(
  application: { id: string; name: string },
  input: { email: string; password: string },
  mailer: Mailer,
): Promise<PublicEndUser> {
  let endUser;
  try {
    // No pre-flight existence check: the composite unique constraint is the
    // only authority, so two concurrent registrations produce exactly one 201
    // and one 409 rather than a race between check and insert.
    endUser = await prisma.endUser.create({
      data: {
        applicationId: application.id,
        email: input.email,
        passwordHash: await hashPassword(input.password),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new HttpError(409, "Email already registered");
    }
    throw err;
  }

  await issueVerificationToken(endUser, application.name, mailer);
  return toPublicEndUser(endUser);
}

export async function authenticateEndUser(
  application: { id: string; requireVerifiedEmail: boolean },
  input: { email: string; password: string },
): Promise<PublicEndUser> {
  // The tenant is part of the lookup key, so an end-user of one application is
  // simply not present when another application asks.
  const endUser = await prisma.endUser.findUnique({
    where: { applicationId_email: { applicationId: application.id, email: input.email } },
  });

  if (!endUser) {
    // Same Argon2 cost as the found path, so the two are not separable by
    // response time.
    await verifyPassword(await getDecoyPasswordHash(), input.password);
    throw new HttpError(401, "Invalid credentials");
  }

  const ok = await verifyPassword(endUser.passwordHash, input.password);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  // Checked only after the password is confirmed correct: answering
  // "unverified" to an unauthenticated guess would confirm the address exists.
  if (application.requireVerifiedEmail && endUser.emailVerifiedAt === null) {
    throw new HttpError(403, "Email not verified", "email_not_verified");
  }

  return toPublicEndUser(endUser);
}
