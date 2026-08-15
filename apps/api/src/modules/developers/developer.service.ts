import { prisma } from "@authforge/db";
import { hashPassword } from "../../lib/password.js";
import { HttpError } from "../../middleware/error-handler.js";

export interface PublicDeveloper {
  id: string;
  email: string;
  name: string;
}

export async function createDeveloper(input: {
  email: string;
  password: string;
  name: string;
}): Promise<PublicDeveloper> {
  const email = input.email.toLowerCase();
  const existing = await prisma.developer.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "Email already registered");

  const developer = await prisma.developer.create({
    data: {
      email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
    },
  });
  return { id: developer.id, email: developer.email, name: developer.name };
}
