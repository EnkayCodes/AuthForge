import express from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { developerRouter } from "./modules/developers/developer.routes.js";
import { applicationRouter } from "./modules/applications/application.routes.js";
import { apiKeyRouter } from "./modules/applications/api-key.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { consoleMailer, type Mailer } from "./lib/mailer.js";
import { createEndUserRouter } from "./modules/end-users/end-user.routes.js";
import { createEmailVerificationRouter } from "./modules/end-users/email-verification.routes.js";

export interface AppDependencies {
  mailer: Mailer;
}

// Dependencies are injected here rather than imported by the services that use
// them, so a test can substitute a recording fake and a deployment can swap the
// transport without either one reaching into a module.
export function createApp(deps: AppDependencies = { mailer: consoleMailer }): express.Express {
  const app = express();
  app.use(express.json());
  app.use(healthRouter);
  app.use(developerRouter);
  app.use(applicationRouter);
  app.use(apiKeyRouter);
  app.use(createEndUserRouter(deps.mailer));
  app.use(createEmailVerificationRouter(deps.mailer));
  app.use(errorHandler);
  return app;
}
