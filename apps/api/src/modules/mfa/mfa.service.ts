import { prisma } from "@authforge/db";
import * as OTPAuth from "otpauth";
import crypto from "node:crypto";
import { HttpError } from "../../middleware/error-handler.js";

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function buildTotpUri(secret: string, email: string, issuer: string): string {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

export async function enrollTotp(endUserId: string, email: string, appName: string) {
  const existing = await prisma.mfaFactor.findUnique({
    where: { endUserId_type: { endUserId, type: "totp" } },
  });
  if (existing?.verifiedAt) {
    throw new HttpError(409, "TOTP already enrolled");
  }

  const secret = generateTotpSecret();

  if (existing) {
    await prisma.mfaFactor.update({
      where: { id: existing.id },
      data: { secret },
    });
  } else {
    await prisma.mfaFactor.create({
      data: { endUserId, type: "totp", secret },
    });
  }

  const uri = buildTotpUri(secret, email, appName);
  return { secret, uri };
}

function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateRecoveryCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex");
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export async function verifyTotp(endUserId: string, code: string) {
  const factor = await prisma.mfaFactor.findUnique({
    where: { endUserId_type: { endUserId, type: "totp" } },
  });
  if (!factor) throw new HttpError(400, "TOTP not enrolled");
  if (factor.verifiedAt) throw new HttpError(409, "TOTP already verified");

  if (!verifyTotpCode(factor.secret, code)) {
    throw new HttpError(400, "Invalid TOTP code");
  }

  await prisma.mfaFactor.update({
    where: { id: factor.id },
    data: { verifiedAt: new Date() },
  });

  const codes = generateRecoveryCodes(8);
  await prisma.recoveryCode.createMany({
    data: codes.map((c) => ({
      endUserId,
      codeHash: hashRecoveryCode(c),
    })),
  });

  return { recoveryCodes: codes };
}

export async function hasMfaEnabled(endUserId: string): Promise<boolean> {
  const factor = await prisma.mfaFactor.findFirst({
    where: { endUserId, verifiedAt: { not: null } },
  });
  return factor !== null;
}

export async function validateMfaCode(
  endUserId: string,
  code: string,
): Promise<boolean> {
  const factor = await prisma.mfaFactor.findUnique({
    where: { endUserId_type: { endUserId, type: "totp" } },
  });
  if (factor?.verifiedAt && verifyTotpCode(factor.secret, code)) {
    return true;
  }

  const codeHash = hashRecoveryCode(code);
  const recovery = await prisma.recoveryCode.findFirst({
    where: { endUserId, codeHash, usedAt: null },
  });
  if (recovery) {
    await prisma.recoveryCode.update({
      where: { id: recovery.id },
      data: { usedAt: new Date() },
    });
    return true;
  }

  return false;
}

export async function disableTotp(endUserId: string) {
  const factor = await prisma.mfaFactor.findUnique({
    where: { endUserId_type: { endUserId, type: "totp" } },
  });
  if (!factor) throw new HttpError(404, "TOTP not enrolled");

  await prisma.mfaFactor.delete({ where: { id: factor.id } });
  await prisma.recoveryCode.deleteMany({ where: { endUserId } });
}
