import express from "express";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(healthRouter);
  return app;
}
