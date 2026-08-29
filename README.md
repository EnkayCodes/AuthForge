# AuthForge

A developer-facing Identity & Access Management platform — authentication as a service that other applications integrate against, rather than a login page bolted onto one app.

Developers register an application, receive credentials, and delegate authentication for their own end-users to AuthForge.

---

## Status

**Two phases complete and tested.** A developer can register an account, create applications, issue API keys for them, and use those keys to authenticate machine-to-machine requests.

The broader platform described in the [roadmap](#roadmap) — end-user authentication, hosted login, OAuth2 with PKCE, RBAC, MFA — is not built yet. This repository is honest about where that line falls.

| Area | State |
| --- | --- |
| Monorepo, TypeScript, database schema | Done |
| Developer signup / login / session tokens | Done |
| Authenticated-route guard | Done |
| Applications — full CRUD, owner-scoped | Done |
| API keys — issue, list, revoke | Done |
| API key authentication | Done |
| Test suite | 77 tests |
| End-user authentication | Planned |
| OAuth2 + PKCE, hosted login page | Planned |
| RBAC, MFA, audit log | Planned |

---

## Why this project

Authentication is deceptively hard. The naive version — hash a password, issue a token — passes a code review and fails a security review. This project exists to get the details right and to make the reasoning visible:

- **Timing-safe credential checks.** A login that returns faster for an unknown email than for a wrong password leaks which accounts exist. Both paths here perform the same Argon2 work.
- **Algorithm pinning.** JWT verification is pinned to HS256. A forged `alg: "none"` token is rejected — and there is a test proving it.
- **Race-safe registration.** Two concurrent signups for the same email produce exactly one `201` and one `409`, not a `500` from a raw constraint violation.
- **Revocation on every request.** The guard re-reads the developer from the database rather than trusting the token payload, so a deleted account cannot keep authenticating with a still-valid token.
- **No credential leakage by construction.** The client-visible shape is built in exactly one place, so a column added later cannot leak by default.
- **The right hash for the job.** Passwords use Argon2id, deliberately slow to make guessing a weak human secret expensive. API keys use SHA-256 — a key is 256 bits of randomness, so guessing is already hopeless, and a slow hash would only add latency to every authenticated request.
- **Absence is indistinguishable from denial.** Asking for another developer's application returns `404`, identical to an id that never existed. A `403` would confirm the resource exists. The ownership filter lives inside the database query, so it cannot be forgotten at a call site.
- **API key secrets are shown once.** Only a hash is stored. There is no endpoint that can return a key again — lose it and you rotate. A database dump yields no working credentials.

---

## Architecture

```
apps/
  api/                     Express + TypeScript service
    src/
      app.ts               createApp() — composable, no port binding
      env.ts               Zod-validated environment, fails fast at boot
      lib/
        password.ts        Argon2id hashing and verification
        session-token.ts   JWT signing and verification (HS256)
        api-key.ts         API key generation, parsing, timing-safe verification
      middleware/
        error-handler.ts   HttpError -> JSON, central and last
        require-developer.ts   Session-token guard — authenticates a developer
        require-api-key.ts     API key guard — authenticates an application
      modules/
        developers/        schema (validation) / service (logic) / routes (HTTP)
        applications/      same split, plus a separate service for API keys
    tests/                 Vitest + Supertest
packages/
  db/                      Prisma schema and shared client singleton
```

Each module is split three ways on purpose: **schema** validates input, **service** owns business logic and database access, **routes** handle only HTTP. Routes never touch the database; services never touch `req`/`res`.

`createApp()` returns an Express app without binding a port, so tests exercise the real HTTP stack in-process.

### Tech stack

TypeScript (strict) · Node 20+ · Express · PostgreSQL · Prisma · Argon2id · JSON Web Tokens · Zod · Vitest · Supertest · pnpm workspaces

---

## Quickstart

**Requirements:** Node 20+, pnpm 9+, and a PostgreSQL database.

```bash
git clone https://github.com/EnkayCodes/AuthForge.git
cd AuthForge
pnpm install
```

Create a `.env` in the repository root from the template:

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` and `DIRECT_URL`, then generate a signing secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put that value in `SESSION_JWT_SECRET`. It must be at least 32 characters — the boot-time check rejects anything shorter.

Apply the schema and start the API:

```bash
pnpm db:migrate
pnpm dev:api
```

The API listens on `http://localhost:4000`. Confirm it is up:

```bash
curl http://localhost:4000/health
```

> **Using Supabase?** `.env.example` documents the two connection URLs it needs — the transaction pooler for queries and the session pooler for migrations — along with the TLS and timeout settings that avoid some non-obvious failure modes.

---

## API

All responses are JSON. Errors use a single consistent shape:

```json
{ "error": { "message": "Invalid credentials" } }
```

### Two kinds of credential

Both arrive in the same header — `Authorization: Bearer <token>` — but they authenticate different things and are never interchangeable:

| | **Session token** | **API key** |
| --- | --- | --- |
| Identifies | a developer | an application |
| Obtained from | signup or login | `POST /applications/:id/keys` |
| Used for | managing your applications and keys | machine-to-machine calls |
| Format | a JWT | `af_live_…` / `af_test_…` |
| Lifetime | expires (7d default) | until revoked |

Presenting one where the other is expected returns `401`. There are tests for both directions.

---

## Developer endpoints

Authenticated with a **session token**.

### `POST /developers/signup`

```json
{ "email": "dev@example.com", "password": "at-least-8-chars", "name": "Dev" }
```

`201` → `{ "developer": { "id", "email", "name" }, "token": "..." }`
`400` invalid payload · `409` email already registered

### `POST /developers/login`

```json
{ "email": "dev@example.com", "password": "at-least-8-chars" }
```

`200` → `{ "developer": { "id", "email", "name" }, "token": "..." }`
`401` invalid credentials — identical response whether the email is unknown or the password is wrong

### `GET /developers/me`

Requires `Authorization: Bearer <token>`.

`200` → `{ "developer": { "id", "email", "name" } }`
`401` missing, malformed, expired, or tampered token — or a token whose developer no longer exists

---

## Application endpoints

Authenticated with a **session token**. Every route is scoped to the calling developer: another developer's application returns `404`, never `403`.

### `POST /applications`

```json
{ "name": "Acme Notes", "environment": "production", "redirectUris": ["https://acme.test/callback"] }
```

`environment` defaults to `development`; `redirectUris` defaults to empty. Redirect URIs must be `https`, or `http` on genuine `localhost` / `127.0.0.1` — a host that merely *starts with* localhost is rejected.

`201` → `{ "application": { "id", "name", "environment", "clientId", "redirectUris", "accessTokenTtl", "refreshTokenTtl", "createdAt" } }`
`400` invalid payload · `401` not authenticated

### `GET /applications`

`200` → `{ "applications": [ … ] }` — yours only, newest first.

### `GET /applications/:id`

`200` → `{ "application": { … } }` · `404` unknown or not yours

### `PATCH /applications/:id`

Any of `name`, `redirectUris`, `accessTokenTtl`, `refreshTokenTtl`. At least one is required.

`200` → `{ "application": { … } }`
`400` empty payload or invalid duration · `404` unknown or not yours

### `DELETE /applications/:id`

`204` no content · `404` unknown or not yours

Deleting an application cascades to its API keys — no credential outlives the thing it authenticates.

---

## API key endpoints

Authenticated with a **session token** (these manage keys; they are not used *by* keys).

### `POST /applications/:id/keys`

```json
{ "label": "CI deploy" }
```

`201` → `{ "apiKey": { "id", "keyId", "label", "lastUsedAt", "revokedAt", "createdAt" }, "token": "af_live_…", "message": "Store this token now. It cannot be retrieved again." }`

**`token` appears in this response and nowhere else, ever.** Only its hash is stored. Production applications get `af_live_…`, everything else `af_test_…`, derived from the application's environment — not from the request.

`400` missing label · `404` unknown application or not yours

### `GET /applications/:id/keys`

`200` → `{ "apiKeys": [ … ] }` — newest first, including revoked ones, since the point of a soft delete is that the record survives. No secret material is ever included.

`404` unknown application or not yours

### `DELETE /applications/:id/keys/:keyId`

Revokes the key by stamping `revokedAt`; the row is kept for the audit trail.

`200` → `{ "apiKey": { … } }`
`404` unknown key, or the key belongs to a different application · `409` already revoked

---

## Authenticating with an API key

### `GET /applications/current`

Requires `Authorization: Bearer af_live_…`. Returns the application the key belongs to — the reference implementation of a key-protected route.

`200` → `{ "application": { "id", "name", "environment", "clientId" } }`
`401` missing, malformed, unknown, wrong-secret, or revoked key — all identical, with no hint which check failed

---

## Testing

```bash
pnpm test
```

77 tests covering hashing, token generation and verification, and the full HTTP lifecycle of every endpoint.

Notable cases, because they are the ones that matter:

- A forged `alg: "none"` token is rejected
- A validly signed token carrying no subject is rejected
- An expired token is rejected
- A valid token for a deleted developer is rejected
- Concurrent duplicate signups yield exactly one `201` and one `409`
- A unique-constraint violation maps to `409`, while an unrelated database error still surfaces as `500`
- `http://localhost.attacker.com` is rejected as a redirect URI, while real localhost is accepted
- One developer cannot read, update, delete, or issue keys for another's application
- A key belonging to one application cannot be revoked or listed through a sibling application the same developer owns
- A revoked key stops authenticating immediately
- A session token is rejected as an API key, and an API key is rejected as a session token

Integration tests run against a real PostgreSQL database rather than mocks, so they exercise real constraints and real driver behaviour.

---

## Design decisions

**Argon2id, not bcrypt.** Memory-hard, and the current recommendation for password storage.

**Opaque failures.** Login returns the same status and message for an unknown email and a wrong password. The auth guard returns the same `401` whether the token was malformed or its developer was deleted. Neither should be an oracle.

**Fail fast on configuration.** Environment variables are validated at import time, so a missing or malformed value stops the process at boot instead of surfacing as a 500 on the first request.

**Errors are typed, not stringly.** Services throw `HttpError(status, message)`; one middleware translates them. Unexpected errors log server-side and return a generic message — internal details never reach the client.

**Migrations are checked in.** Schema changes are reviewable in version control and replayable in CI.

**Ownership is enforced in the query, not after it.** Every scoped read and write carries `developerId` in its `where` clause, so authorization cannot be skipped by forgetting a check at a call site. Writes use a single statement that encodes every invariant, rather than reading, deciding, then writing — a pattern that fails under concurrency.

**Revocation is a soft delete.** Killing a key stamps `revokedAt` instead of removing the row, so the record of which credentials existed and when they were revoked survives for an incident review.

---

## Roadmap

Building toward the full platform, in order:

1. ~~**Applications & API keys**~~ — done
2. **End-user authentication** — accounts scoped per application, with email verification and password reset
3. **OAuth2 authorization-code flow with PKCE** — plus RS256 access tokens and a JWKS endpoint
4. **Hosted login page** — a themed universal login apps redirect to
5. **RBAC** — roles and permissions enforced in middleware
6. **MFA** — TOTP with recovery codes
7. **Refresh-token rotation** with reuse detection, session listing, and revocation
8. **Developer dashboard**, audit log viewer, and a TypeScript SDK

Deliberately out of scope for now: organizations and teams, SSO/SAML/SCIM, billing, and multi-language SDKs.

### Known limitations

Named rather than hidden, since this is a foundation rather than a finished product:

- No rate limiting or account lockout on authentication endpoints yet
- Session tokens are valid until expiry; there is no logout or token blocklist
- No security headers or CORS policy — the API is not browser-facing yet
- API keys carry no scopes or permissions: any valid key authenticates as its full application
- API keys do not expire; they are valid until explicitly revoked
- Application deletion is permanent and immediate — no archive, no undo
