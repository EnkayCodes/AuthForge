import { consoleMailer } from "./lib/mailer.js";
import { createEmailWorker } from "./lib/email-queue.js";
import { closeRedis } from "./lib/redis.js";

const worker = createEmailWorker(consoleMailer);

worker.on("completed", (job) => {
  console.log(`[worker] completed job ${job.id} (${job.name})`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] failed job ${job?.id} (${job?.name}):`, err.message);
});

console.log("[worker] email worker started");

async function shutdown() {
  console.log("[worker] shutting down…");
  await worker.close();
  await closeRedis();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
