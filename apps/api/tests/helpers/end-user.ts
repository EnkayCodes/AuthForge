import request from "supertest";
import type { createApp } from "../../src/app.js";

export interface ApplicationContext {
  token: string;
  applicationId: string;
  apiKey: string;
}

// Every end-user test needs a developer, an application, and an API key before
// it can say anything about end-users, so the sequence lives in one place.
export async function setupApplication(
  app: ReturnType<typeof createApp>,
  options: { email?: string; name?: string; requireVerifiedEmail?: boolean } = {},
): Promise<ApplicationContext> {
  const signup = await request(app)
    .post("/developers/signup")
    .send({ email: options.email ?? "dev@example.com", password: "password123", name: "Dev" });
  const token = signup.body.token as string;

  const created = await request(app)
    .post("/applications")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: options.name ?? "Acme" });
  const applicationId = created.body.application.id as string;

  if (options.requireVerifiedEmail === false) {
    await request(app)
      .patch(`/applications/${applicationId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ requireVerifiedEmail: false });
  }

  const key = await request(app)
    .post(`/applications/${applicationId}/keys`)
    .set("Authorization", `Bearer ${token}`)
    .send({ label: "test key" });

  // The full token is returned at the top level, once, at creation time — it is
  // never part of the PublicApiKey shape.
  return { token, applicationId, apiKey: key.body.token as string };
}
