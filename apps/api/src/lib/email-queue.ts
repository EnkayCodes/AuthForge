import { Queue, Worker, type Job } from "bullmq";
import type { Mailer, MailerMessage } from "./mailer.js";
import { getRedisConnection } from "./redis.js";

const QUEUE_NAME = "email";

export interface EmailJobData {
  kind: "verification" | "password-reset";
  message: MailerMessage;
}

export function createEmailQueue(): Queue<EmailJobData> {
  return new Queue<EmailJobData>(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
}

export function createQueueMailer(queue: Queue<EmailJobData>): Mailer {
  return {
    async sendVerificationEmail(message) {
      await queue.add("verification", { kind: "verification", message });
    },
    async sendPasswordResetEmail(message) {
      await queue.add("password-reset", { kind: "password-reset", message });
    },
  };
}

export function createEmailWorker(transport: Mailer): Worker<EmailJobData> {
  return new Worker<EmailJobData>(
    QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { kind, message } = job.data;
      if (kind === "verification") {
        await transport.sendVerificationEmail(message);
      } else {
        await transport.sendPasswordResetEmail(message);
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );
}
