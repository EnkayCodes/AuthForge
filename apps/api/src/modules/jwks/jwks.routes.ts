import { Router, type Router as RouterType } from "express";
import { getJwks } from "../../lib/jwks.js";

export const jwksRouter: RouterType = Router();

jwksRouter.get("/.well-known/jwks.json", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(getJwks());
});
