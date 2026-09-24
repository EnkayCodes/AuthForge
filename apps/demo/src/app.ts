import express from "express";
import { AuthForge } from "@authforge/sdk";

const app = express();
const port = Number(process.env.PORT) || 3001;

// --- HTML templates ---

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 640px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    a { color: #2563eb; }
    h1 { margin-bottom: 0.5rem; }
    p { margin-bottom: 1rem; }
    dl { margin: 1rem 0; }
    dt { font-weight: 600; margin-top: 0.75rem; }
    dd { margin-left: 1rem; color: #4b5563; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function homePage(): string {
  return layout(
    "Acme Notes",
    `<h1>Acme Notes</h1>
     <p>A demo app powered by AuthForge.</p>
     <p><a href="/auth/login">Sign in with AuthForge &rarr;</a></p>`,
  );
}

function dashboardPage(user: { id: string; email: string; emailVerified: boolean; permissions: string[] }): string {
  return layout(
    "Dashboard — Acme Notes",
    `<h1>Dashboard</h1>
     <dl>
       <dt>User ID</dt>
       <dd>${user.id}</dd>
       <dt>Email</dt>
       <dd>${user.email}</dd>
       <dt>Email verified</dt>
       <dd>${String(user.emailVerified)}</dd>
       <dt>Permissions</dt>
       <dd>${user.permissions.length > 0 ? user.permissions.join(", ") : "none"}</dd>
     </dl>
     <p><a href="/auth/logout">Sign out</a></p>`,
  );
}

// --- AuthForge SDK ---

const auth = new AuthForge({
  baseUrl: process.env.AUTHFORGE_URL!,
  clientId: process.env.CLIENT_ID!,
  redirectUri: process.env.REDIRECT_URI!,
  apiKey: process.env.API_KEY!,
  postLoginRedirect: "/dashboard",
  postLogoutRedirect: "/",
  onError: (err) => console.error("[AuthForge]", err.message),
});

// --- Routes ---

app.get("/", (_req, res) => {
  res.type("html").send(homePage());
});

app.get("/auth/login", auth.login());
app.get("/auth/callback", auth.callback());
app.get("/auth/logout", auth.logout());

app.get("/dashboard", auth.requireAuth(), (req, res) => {
  res.type("html").send(dashboardPage(req.user!));
});

// --- Start ---

app.listen(port, () => {
  console.log(`Acme Notes demo running at http://localhost:${port}`);
});
