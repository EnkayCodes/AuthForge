import { describe, it, expect, beforeEach } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";

beforeEach(resetDb);

function generatePkce() {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

async function registerEndUser(
  app: ReturnType<typeof createApp>,
  apiKey: string,
  email = "user@example.com",
) {
  await request(app)
    .post("/users/register")
    .set("Authorization", `Bearer ${apiKey}`)
    .send({ email, password: "password123" });
}

async function getClientId(app: ReturnType<typeof createApp>, token: string, applicationId: string) {
  const res = await request(app)
    .get(`/applications/${applicationId}`)
    .set("Authorization", `Bearer ${token}`);
  return res.body.application.clientId as string;
}

async function setRedirectUri(
  app: ReturnType<typeof createApp>,
  token: string,
  applicationId: string,
  uri: string,
) {
  await request(app)
    .patch(`/applications/${applicationId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ redirectUris: [uri] });
}

describe("GET /authorize", () => {
  it("redirects to the login page with the right query params", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { token, applicationId } = await setupApplication(app);
    const clientId = await getClientId(app, token, applicationId);
    await setRedirectUri(app, token, applicationId, "https://example.com/callback");
    const { codeChallenge } = generatePkce();

    const res = await request(app)
      .get("/authorize")
      .query({
        response_type: "code",
        client_id: clientId,
        redirect_uri: "https://example.com/callback",
        state: "random-state",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.searchParams.get("client_id")).toBe(clientId);
    expect(location.searchParams.get("state")).toBe("random-state");
  });

  it("rejects an unknown client_id", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { codeChallenge } = generatePkce();

    const res = await request(app)
      .get("/authorize")
      .query({
        response_type: "code",
        client_id: "nonexistent",
        redirect_uri: "https://example.com/callback",
        state: "s",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

    expect(res.status).toBe(400);
  });

  it("rejects a redirect_uri not registered on the application", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { token, applicationId } = await setupApplication(app);
    const clientId = await getClientId(app, token, applicationId);
    await setRedirectUri(app, token, applicationId, "https://example.com/callback");
    const { codeChallenge } = generatePkce();

    const res = await request(app)
      .get("/authorize")
      .query({
        response_type: "code",
        client_id: clientId,
        redirect_uri: "https://evil.com/callback",
        state: "s",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

    expect(res.status).toBe(400);
  });
});

describe("POST /oauth/callback + POST /token (full flow)", () => {
  it("authenticates a user and exchanges the code for tokens", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { token, applicationId, apiKey } = await setupApplication(app, {
      requireVerifiedEmail: false,
    });
    const clientId = await getClientId(app, token, applicationId);
    await setRedirectUri(app, token, applicationId, "https://example.com/callback");
    await registerEndUser(app, apiKey);
    const { codeVerifier, codeChallenge } = generatePkce();

    const callback = await request(app)
      .post("/oauth/callback")
      .send({
        client_id: clientId,
        redirect_uri: "https://example.com/callback",
        state: "random-state",
        code_challenge: codeChallenge,
        email: "user@example.com",
        password: "password123",
      });

    expect(callback.status).toBe(200);
    const redirectUri = new URL(callback.body.redirect_uri);
    const code = redirectUri.searchParams.get("code")!;
    expect(code).toBeDefined();
    expect(redirectUri.searchParams.get("state")).toBe("random-state");

    const tokenRes = await request(app)
      .post("/token")
      .send({
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://example.com/callback",
        client_id: clientId,
        code_verifier: codeVerifier,
      });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.token_type).toBe("Bearer");
    expect(typeof tokenRes.body.access_token).toBe("string");
    expect(typeof tokenRes.body.refresh_token).toBe("string");
    expect(tokenRes.body.expires_in).toBeGreaterThan(0);

    const jwks = await request(app).get("/.well-known/jwks.json");
    const publicKey = crypto.createPublicKey({ key: jwks.body.keys[0], format: "jwk" });
    const decoded = jwt.verify(tokenRes.body.access_token, publicKey, {
      algorithms: ["RS256"],
    }) as jwt.JwtPayload;
    expect(decoded.email).toBe("user@example.com");
    expect(decoded.aud).toBe(clientId);
  });

  it("rejects a replayed authorization code", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { token, applicationId, apiKey } = await setupApplication(app, {
      requireVerifiedEmail: false,
    });
    const clientId = await getClientId(app, token, applicationId);
    await setRedirectUri(app, token, applicationId, "https://example.com/callback");
    await registerEndUser(app, apiKey);
    const { codeVerifier, codeChallenge } = generatePkce();

    const callback = await request(app)
      .post("/oauth/callback")
      .send({
        client_id: clientId,
        redirect_uri: "https://example.com/callback",
        state: "s",
        code_challenge: codeChallenge,
        email: "user@example.com",
        password: "password123",
      });
    const code = new URL(callback.body.redirect_uri).searchParams.get("code")!;

    await request(app).post("/token").send({
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://example.com/callback",
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    const replay = await request(app).post("/token").send({
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://example.com/callback",
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    expect(replay.status).toBe(400);
  });

  it("rejects a wrong code_verifier (PKCE failure)", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { token, applicationId, apiKey } = await setupApplication(app, {
      requireVerifiedEmail: false,
    });
    const clientId = await getClientId(app, token, applicationId);
    await setRedirectUri(app, token, applicationId, "https://example.com/callback");
    await registerEndUser(app, apiKey);
    const { codeChallenge } = generatePkce();

    const callback = await request(app)
      .post("/oauth/callback")
      .send({
        client_id: clientId,
        redirect_uri: "https://example.com/callback",
        state: "s",
        code_challenge: codeChallenge,
        email: "user@example.com",
        password: "password123",
      });
    const code = new URL(callback.body.redirect_uri).searchParams.get("code")!;

    const wrongVerifier = randomBytes(32).toString("base64url");
    const res = await request(app).post("/token").send({
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://example.com/callback",
      client_id: clientId,
      code_verifier: wrongVerifier,
    });

    expect(res.status).toBe(400);
  });

  it("rejects wrong credentials in the callback", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { token, applicationId, apiKey } = await setupApplication(app, {
      requireVerifiedEmail: false,
    });
    const clientId = await getClientId(app, token, applicationId);
    await setRedirectUri(app, token, applicationId, "https://example.com/callback");
    await registerEndUser(app, apiKey);
    const { codeChallenge } = generatePkce();

    const res = await request(app)
      .post("/oauth/callback")
      .send({
        client_id: clientId,
        redirect_uri: "https://example.com/callback",
        state: "s",
        code_challenge: codeChallenge,
        email: "user@example.com",
        password: "wrong-password",
      });

    expect(res.status).toBe(401);
  });

  it("rejects a mismatched redirect_uri on the token exchange", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { token, applicationId, apiKey } = await setupApplication(app, {
      requireVerifiedEmail: false,
    });
    const clientId = await getClientId(app, token, applicationId);
    await setRedirectUri(app, token, applicationId, "https://example.com/callback");
    await registerEndUser(app, apiKey);
    const { codeVerifier, codeChallenge } = generatePkce();

    const callback = await request(app)
      .post("/oauth/callback")
      .send({
        client_id: clientId,
        redirect_uri: "https://example.com/callback",
        state: "s",
        code_challenge: codeChallenge,
        email: "user@example.com",
        password: "password123",
      });
    const code = new URL(callback.body.redirect_uri).searchParams.get("code")!;

    const res = await request(app).post("/token").send({
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://other.com/callback",
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    expect(res.status).toBe(400);
  });
});
