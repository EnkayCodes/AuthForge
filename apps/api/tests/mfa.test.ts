import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import * as OTPAuth from "otpauth";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";

beforeEach(resetDb);

function generateCode(secret: string): string {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.generate();
}

async function registerAndGetId(
  app: ReturnType<typeof createApp>,
  apiKey: string,
  email = "user@example.com",
) {
  const res = await request(app)
    .post("/users/register")
    .set("Authorization", `Bearer ${apiKey}`)
    .send({ email, password: "password123" });
  return res.body.endUser.id as string;
}

describe("MFA TOTP", () => {
  it("enrolls, verifies, and enforces MFA on login", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const userId = await registerAndGetId(app, apiKey);

    const enrollRes = await request(app)
      .post(`/users/${userId}/mfa/totp/enroll`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(enrollRes.status).toBe(200);
    expect(enrollRes.body.secret).toBeDefined();
    expect(enrollRes.body.uri).toContain("otpauth://totp/");
    const secret = enrollRes.body.secret as string;

    const code = generateCode(secret);
    const verifyRes = await request(app)
      .post(`/users/${userId}/mfa/totp/verify`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ code });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.recoveryCodes).toHaveLength(8);

    const loginRes = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.mfaRequired).toBe(true);
    expect(loginRes.body.mfaToken).toBeDefined();

    const mfaCode = generateCode(secret);
    const challengeRes = await request(app)
      .post("/users/mfa/challenge")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ mfa_token: loginRes.body.mfaToken, code: mfaCode });
    expect(challengeRes.status).toBe(200);
    expect(challengeRes.body.accessToken).toBeDefined();
    expect(challengeRes.body.refreshToken).toBeDefined();
  });

  it("accepts a recovery code for the MFA challenge", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const userId = await registerAndGetId(app, apiKey);
    const enrollRes = await request(app)
      .post(`/users/${userId}/mfa/totp/enroll`)
      .set("Authorization", `Bearer ${apiKey}`);
    const secret = enrollRes.body.secret as string;

    const code = generateCode(secret);
    const verifyRes = await request(app)
      .post(`/users/${userId}/mfa/totp/verify`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ code });
    const recoveryCodes = verifyRes.body.recoveryCodes as string[];

    const loginRes = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const challengeRes = await request(app)
      .post("/users/mfa/challenge")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ mfa_token: loginRes.body.mfaToken, code: recoveryCodes[0] });
    expect(challengeRes.status).toBe(200);
    expect(challengeRes.body.accessToken).toBeDefined();

    const loginRes2 = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });
    const replayRes = await request(app)
      .post("/users/mfa/challenge")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ mfa_token: loginRes2.body.mfaToken, code: recoveryCodes[0] });
    expect(replayRes.status).toBe(401);
  });

  it("rejects an invalid TOTP code", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const userId = await registerAndGetId(app, apiKey);
    const enrollRes = await request(app)
      .post(`/users/${userId}/mfa/totp/enroll`)
      .set("Authorization", `Bearer ${apiKey}`);
    const secret = enrollRes.body.secret as string;

    const code = generateCode(secret);
    await request(app)
      .post(`/users/${userId}/mfa/totp/verify`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ code });

    const loginRes = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const badRes = await request(app)
      .post("/users/mfa/challenge")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ mfa_token: loginRes.body.mfaToken, code: "000000" });
    expect(badRes.status).toBe(401);
  });

  it("disables TOTP and removes recovery codes", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const userId = await registerAndGetId(app, apiKey);
    const enrollRes = await request(app)
      .post(`/users/${userId}/mfa/totp/enroll`)
      .set("Authorization", `Bearer ${apiKey}`);

    const code = generateCode(enrollRes.body.secret as string);
    await request(app)
      .post(`/users/${userId}/mfa/totp/verify`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ code });

    const delRes = await request(app)
      .delete(`/users/${userId}/mfa/totp`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(delRes.status).toBe(204);

    const loginRes = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });
    expect(loginRes.body.mfaRequired).toBeUndefined();
    expect(loginRes.body.accessToken).toBeDefined();
  });
});
