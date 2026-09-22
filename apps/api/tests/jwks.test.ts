import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";

beforeEach(resetDb);

describe("GET /.well-known/jwks.json", () => {
  it("returns a JWKS with one RS256 key", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });

    const res = await request(app).get("/.well-known/jwks.json");

    expect(res.status).toBe(200);
    expect(res.body.keys).toHaveLength(1);
    const key = res.body.keys[0];
    expect(key.kty).toBe("RSA");
    expect(key.alg).toBe("RS256");
    expect(key.use).toBe("sig");
    expect(key.kid).toBeDefined();
    expect(key.n).toBeDefined();
    expect(key.e).toBeDefined();
  });

  it("sets a cache-control header", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });

    const res = await request(app).get("/.well-known/jwks.json");

    expect(res.headers["cache-control"]).toContain("max-age=3600");
  });

  it("serves the same kid across requests", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });

    const first = await request(app).get("/.well-known/jwks.json");
    const second = await request(app).get("/.well-known/jwks.json");

    expect(first.body.keys[0].kid).toBe(second.body.keys[0].kid);
  });
});

describe("access token verification via JWKS", () => {
  it("the login access token is verifiable with the JWKS public key", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const login = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const accessToken = login.body.accessToken;
    expect(typeof accessToken).toBe("string");

    const jwks = await request(app).get("/.well-known/jwks.json");
    const jwk = jwks.body.keys[0];
    const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });

    const decoded = jwt.verify(accessToken, publicKey, { algorithms: ["RS256"] }) as jwt.JwtPayload;
    expect(decoded.sub).toBe(login.body.endUser.id);
    expect(decoded.email).toBe("user@example.com");
    expect(decoded.email_verified).toBe(false);
  });

  it("the token kid matches the JWKS kid", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const login = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const header = JSON.parse(
      Buffer.from(login.body.accessToken.split(".")[0], "base64url").toString(),
    );
    const jwks = await request(app).get("/.well-known/jwks.json");

    expect(header.kid).toBe(jwks.body.keys[0].kid);
    expect(header.alg).toBe("RS256");
  });

  it("the token audience is the application client_id", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const login = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const jwks = await request(app).get("/.well-known/jwks.json");
    const publicKey = crypto.createPublicKey({ key: jwks.body.keys[0], format: "jwk" });

    const decoded = jwt.verify(login.body.accessToken, publicKey, {
      algorithms: ["RS256"],
    }) as jwt.JwtPayload;
    expect(decoded.aud).toBeDefined();
  });

  it("a token signed with a different key is rejected", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });

    const jwks = await request(app).get("/.well-known/jwks.json");
    const publicKey = crypto.createPublicKey({ key: jwks.body.keys[0], format: "jwk" });

    const rogue = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    const forged = jwt.sign({ sub: "fake" }, rogue.privateKey, { algorithm: "RS256" });

    expect(() => jwt.verify(forged, publicKey, { algorithms: ["RS256"] })).toThrow();
  });
});
