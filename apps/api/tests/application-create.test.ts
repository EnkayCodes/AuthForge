import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

beforeEach(resetDb);

async function signUpDeveloper(app: ReturnType<typeof createApp>, email = "dev@example.com") {
  const res = await request(app)
    .post("/developers/signup")
    .send({ email, password: "password123", name: "Dev" });
  return res.body.token as string;
}

describe("POST /applications", () => {
  it("creates an application for the authenticated developer", async () => {
    const app = createApp();
    const token = await signUpDeveloper(app);

    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme Notes" });

    expect(res.status).toBe(201);
    expect(res.body.application).toMatchObject({
      name: "Acme Notes",
      environment: "development",
      redirectUris: [],
    });
    expect(res.body.application.id).toBeTruthy();
    expect(res.body.application.clientId).toBeTruthy();
    expect(res.body.application.developerId).toBeUndefined();
  });

  it("accepts an explicit environment and redirect uris", async () => {
    const app = createApp();
    const token = await signUpDeveloper(app);

    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Acme Prod",
        environment: "production",
        redirectUris: ["https://acme.test/callback"],
      });

    expect(res.status).toBe(201);
    expect(res.body.application.environment).toBe("production");
    expect(res.body.application.redirectUris).toEqual(["https://acme.test/callback"]);
  });

  it("rejects a missing name with 400", async () => {
    const app = createApp();
    const token = await signUpDeveloper(app);
    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("accepts http only for genuine localhost", async () => {
    const app = createApp();
    const token = await signUpDeveloper(app);
    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme Local", redirectUris: ["http://localhost:3000/callback"] });
    expect(res.status).toBe(201);
  });

  // A prefix match would let these through; they are entirely different hosts.
  it("rejects http hosts that merely start with localhost", async () => {
    const app = createApp();
    const token = await signUpDeveloper(app);
    for (const uri of [
      "http://localhost.attacker.com/callback",
      "http://localhostXYZ.example.com/callback",
      "http://notlocalhost/callback",
    ]) {
      const res = await request(app)
        .post("/applications")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Acme", redirectUris: [uri] });
      expect(res.status, `expected ${uri} to be rejected`).toBe(400);
    }
  });

  it("rejects a non-https redirect uri with 400", async () => {
    const app = createApp();
    const token = await signUpDeveloper(app);
    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme", redirectUris: ["not-a-url"] });
    expect(res.status).toBe(400);
  });

  it("rejects an unauthenticated request with 401", async () => {
    const res = await request(createApp()).post("/applications").send({ name: "Acme" });
    expect(res.status).toBe(401);
  });
});
