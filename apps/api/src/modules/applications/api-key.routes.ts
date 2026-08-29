import { Router } from "express";
import { requireDeveloper } from "../../middleware/require-developer.js";
import { HttpError } from "../../middleware/error-handler.js";
import { issueApiKeySchema } from "./application.schema.js";
import { issueApiKey, listApiKeys, revokeApiKey } from "./api-key.service.js";

export const apiKeyRouter: Router = Router();

apiKeyRouter.post("/applications/:id/keys", requireDeveloper, async (req, res, next) => {
  try {
    const developer = req.developer;
    if (!developer) throw new HttpError(401, "Unauthorized");
    const parsed = issueApiKeySchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid api key payload");
    const { apiKey, token } = await issueApiKey(developer.id, req.params.id, parsed.data.label);
    res.status(201).json({
      apiKey,
      token,
      message: "Store this token now. It cannot be retrieved again.",
    });
  } catch (err) {
    next(err);
  }
});

apiKeyRouter.get("/applications/:id/keys", requireDeveloper, async (req, res, next) => {
  try {
    const developer = req.developer;
    if (!developer) throw new HttpError(401, "Unauthorized");
    const apiKeys = await listApiKeys(developer.id, req.params.id);
    res.status(200).json({ apiKeys });
  } catch (err) {
    next(err);
  }
});

apiKeyRouter.delete("/applications/:id/keys/:keyId", requireDeveloper, async (req, res, next) => {
  try {
    const developer = req.developer;
    if (!developer) throw new HttpError(401, "Unauthorized");
    const apiKey = await revokeApiKey(developer.id, req.params.id, req.params.keyId);
    res.status(200).json({ apiKey });
  } catch (err) {
    next(err);
  }
});
