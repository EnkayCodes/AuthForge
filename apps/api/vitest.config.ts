import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/helpers/setup.ts"],
    fileParallelism: false,
    // DB-touching tests round-trip to a live Postgres instance (plus Argon2
    // hashing, ~a few hundred ms per call); the 5s default is too tight.
    // A test that seeds several developers and applications makes many round
    // trips to a remote database, and Argon2 hashing sits on top of each signup.
    // CI runs against a local Postgres container and finishes far inside this.
    testTimeout: 45000,
  },
});
