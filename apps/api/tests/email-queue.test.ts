import { describe, it, expect } from "vitest";
import { createQueueMailer } from "../src/lib/email-queue.js";
import type { EmailJobData } from "../src/lib/email-queue.js";

function createMockQueue() {
  const jobs: { name: string; data: EmailJobData }[] = [];
  const queue = {
    add: async (name: string, data: EmailJobData) => {
      jobs.push({ name, data });
    },
  };
  return { queue: queue as any, jobs };
}

describe("queue mailer", () => {
  it("enqueues a verification email job", async () => {
    const { queue, jobs } = createMockQueue();
    const mailer = createQueueMailer(queue);

    await mailer.sendVerificationEmail({
      to: "user@example.com",
      token: "abc123",
      applicationName: "Acme",
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].name).toBe("verification");
    expect(jobs[0].data.kind).toBe("verification");
    expect(jobs[0].data.message.to).toBe("user@example.com");
    expect(jobs[0].data.message.token).toBe("abc123");
  });

  it("enqueues a password-reset email job", async () => {
    const { queue, jobs } = createMockQueue();
    const mailer = createQueueMailer(queue);

    await mailer.sendPasswordResetEmail({
      to: "user@example.com",
      token: "xyz789",
      applicationName: "Acme",
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].name).toBe("password-reset");
    expect(jobs[0].data.kind).toBe("password-reset");
    expect(jobs[0].data.message.to).toBe("user@example.com");
  });
});
