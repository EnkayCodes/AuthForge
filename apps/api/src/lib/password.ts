import argon2 from "argon2";
import { randomBytes } from "node:crypto";

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Verifying a password costs a few hundred milliseconds of Argon2 work. A
// lookup that misses must do the same work, or an unknown address would answer
// measurably faster than a wrong password and reveal which accounts exist.
// Computed once, lazily, so startup stays cheap. Shared by every credential
// check — developers and end-users alike — so the defence cannot be present in
// one and forgotten in the other.
let decoyPasswordHash: Promise<string> | undefined;

export function getDecoyPasswordHash(): Promise<string> {
  decoyPasswordHash ??= hashPassword(randomBytes(32).toString("hex"));
  return decoyPasswordHash;
}
