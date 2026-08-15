import { afterAll } from "vitest";
// Must load before "./db.js": db.js imports the @authforge/db Prisma singleton,
// which is constructed at import time and needs DATABASE_URL already in
// process.env. env.js loads the root .env as an import-time side effect.
import "../../src/env.js";
import { disconnectDb } from "./db.js";

// The Prisma client is a module-level singleton, so a test file that queries the
// database leaves an open connection. Close it after each test file so Vitest can
// exit cleanly instead of hanging on the open handle.
afterAll(async () => {
  await disconnectDb();
});
