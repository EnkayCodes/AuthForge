import express from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { developerRouter } from "./modules/developers/developer.routes.js";
import { applicationRouter } from "./modules/applications/application.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(healthRouter);
  app.use(developerRouter);
  app.use(applicationRouter);
  app.use(errorHandler);
  return app;
}
