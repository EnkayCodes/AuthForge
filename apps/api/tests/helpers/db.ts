import { prisma } from "@authforge/db";

export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_logs,
      sessions,
      recovery_codes,
      mfa_factors,
      user_roles,
      role_permissions,
      roles,
      permissions,
      oauth_accounts,
      authorization_codes,
      refresh_tokens,
      password_reset_tokens,
      verification_tokens,
      end_users,
      api_keys,
      applications,
      developers
    CASCADE
  `);
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
