import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/helpers/setup.ts"],
    fileParallelism: false,
    // DB-touching tests round-trip to a live Postgres instance (plus Argon2
    // hashing, ~a few hundred ms per call); the 5s default is too tight.
    testTimeout: 20000,
  },
});
