import { createApp } from "./app.js";
import { consoleMailer } from "./lib/mailer.js";
import { createEmailQueue, createQueueMailer } from "./lib/email-queue.js";

const port = Number(process.env.PORT ?? 4000);

const mailer = process.env.REDIS_URL
  ? createQueueMailer(createEmailQueue())
  : consoleMailer;

createApp({ mailer }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  if (process.env.REDIS_URL) {
    console.log("Email delivery: queued via BullMQ (start the worker with pnpm run worker)");
  } else {
    console.log("Email delivery: inline console (set REDIS_URL to enable the queue)");
  }
});
