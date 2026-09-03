import { prisma, Prisma } from "@authforge/db";
import { hashPassword, verifyPassword, getDecoyPasswordHash } from "../../lib/password.js";
import { HttpError } from "../../middleware/error-handler.js";

export interface PublicDeveloper {
  id: string;
  email: string;
  name: string;
}

// The single place a Developer row becomes client-visible. Picking fields
// explicitly here (rather than spreading the row at each call site) means a
// column added later — another credential, a recovery code — cannot leak by
// default, and there is only one place to audit.
export function toPublicDeveloper(developer: {
  id: string;
  email: string;
  name: string;
}): PublicDeveloper {
  return { id: developer.id, email: developer.email, name: developer.name };
}

export async function createDeveloper(input: {
  email: string;
  password: string;
  name: string;
}): Promise<PublicDeveloper> {
  const email = input.email.toLowerCase();
  const existing = await prisma.developer.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "Email already registered");

  let developer;
  try {
    developer = await prisma.developer.create({
      data: {
        email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new HttpError(409, "Email already registered");
    }
    throw err;
  }
  return toPublicDeveloper(developer);
}

export async function authenticateDeveloper(input: {
  email: string;
  password: string;
}): Promise<PublicDeveloper> {
  const email = input.email.toLowerCase();
  const developer = await prisma.developer.findUnique({ where: { email } });

  if (!developer) {
    await verifyPassword(await getDecoyPasswordHash(), input.password);
    throw new HttpError(401, "Invalid credentials");
  }

  const ok = await verifyPassword(developer.passwordHash, input.password);
  if (!ok) throw new HttpError(401, "Invalid credentials");
  return toPublicDeveloper(developer);
}
