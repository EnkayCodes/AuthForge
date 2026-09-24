import express from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { developerRouter } from "./modules/developers/developer.routes.js";
import { applicationRouter } from "./modules/applications/application.routes.js";
import { apiKeyRouter } from "./modules/applications/api-key.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { consoleMailer, type Mailer } from "./lib/mailer.js";
import { createEndUserRouter } from "./modules/end-users/end-user.routes.js";
import { createEmailVerificationRouter } from "./modules/end-users/email-verification.routes.js";
import { createPasswordResetRouter } from "./modules/end-users/password-reset.routes.js";
import { createRefreshTokenRouter } from "./modules/end-users/refresh-token.routes.js";
import { createOAuthRouter } from "./modules/oauth/oauth.routes.js";
import { createOAuthCallbackRouter } from "./modules/oauth/oauth-callback.routes.js";
import { createGoogleOAuthRouter } from "./modules/oauth/google.routes.js";
import { createRbacRouter } from "./modules/rbac/rbac.routes.js";
import { createMfaRouter } from "./modules/mfa/mfa.routes.js";
import { createMfaChallengeRouter } from "./modules/mfa/mfa-challenge.routes.js";
import { createSessionRouter } from "./modules/sessions/session.routes.js";
import { createAuditRouter } from "./modules/audit/audit.routes.js";
import { jwksRouter } from "./modules/jwks/jwks.routes.js";
import { createDashboardRbacRouter } from "./modules/rbac/rbac-dashboard.routes.js";
import { createDashboardAuditRouter } from "./modules/audit/audit-dashboard.routes.js";
import { createDashboardSessionRouter } from "./modules/sessions/session-dashboard.routes.js";
import { cors } from "./middleware/cors.js";

export interface AppDependencies {
  mailer: Mailer;
}

// Dependencies are injected here rather than imported by the services that use
// them, so a test can substitute a recording fake and a deployment can swap the
// transport without either one reaching into a module.
export function createApp(deps: AppDependencies = { mailer: consoleMailer }): express.Express {
  const app = express();
  app.use(cors);
  app.use(express.json());
  app.use(healthRouter);
  app.use(developerRouter);
  app.use(applicationRouter);
  app.use(apiKeyRouter);
  app.use(createEndUserRouter(deps.mailer));
  app.use(createEmailVerificationRouter(deps.mailer));
  app.use(createPasswordResetRouter(deps.mailer));
  app.use(createRefreshTokenRouter());
  app.use(createOAuthRouter());
  app.use(createOAuthCallbackRouter(deps.mailer));
  app.use(createGoogleOAuthRouter());
  app.use(createRbacRouter());
  app.use(createMfaRouter());
  app.use(createMfaChallengeRouter());
  app.use(createSessionRouter());
  app.use(createAuditRouter());
  app.use(createDashboardRbacRouter());
  app.use(createDashboardAuditRouter());
  app.use(createDashboardSessionRouter());
  app.use(jwksRouter);
  app.use(errorHandler);
  return app;
}
