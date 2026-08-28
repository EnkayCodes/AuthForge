import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// apps/api/src -> monorepo root
const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env");
config({ path: rootEnv, quiet: true });

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1),
  // HS256 signing key. RFC 2104 recommends key material at least as long as
  // the hash output (32 bytes for SHA-256).
  SESSION_JWT_SECRET: z.string().min(32),
  // A duration jsonwebtoken understands: seconds, or a number with a unit
  // (30s, 15m, 24h, 7d). Validated here so a typo fails at boot rather than
  // surfacing as a 500 on the first sign-in.
  SESSION_JWT_TTL: z
    .string()
    .regex(/^\d+(\.\d+)?\s?(ms|s|m|h|d|w|y)?$/, "must be a duration like 30s, 15m, 24h or 7d")
    .default("7d"),
});

export const env = schema.parse(process.env);
