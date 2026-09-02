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
    // Raised from 45s once end-user tests landed: a single case now performs a
    // developer signup, an application, an API key, a registration and a token
    // exchange, each an Argon2 hash or a round trip to a remote region, and
    // measured runs sit between 30s and 70s. The old ceiling was below the
    // median, so failures reported latency rather than defects.
    testTimeout: 120000,
    // beforeEach(resetDb) is a cascading delete against the same remote
    // database and routinely exceeds Vitest's 10s hook default, which would
    // otherwise fail tests for a reason that has nothing to do with them.
    hookTimeout: 120000,
  },
});
