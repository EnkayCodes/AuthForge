import { afterAll } from "vitest";
import { disconnectDb } from "./db.js";

// The Prisma client is a module-level singleton, so a test file that queries the
// database leaves an open connection. Close it after each test file so Vitest can
// exit cleanly instead of hanging on the open handle.
afterAll(async () => {
  await disconnectDb();
});
