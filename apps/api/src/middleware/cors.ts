import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";

export function cors(req: Request, res: Response, next: NextFunction) {
  res.header("Access-Control-Allow-Origin", env.CORS_ORIGIN);
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
