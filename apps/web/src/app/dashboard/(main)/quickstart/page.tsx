"use client";

import { Card } from "@/components/ui/card";

const steps = [
  {
    title: "1. Install the SDK",
    code: `npm install @authforge/sdk`,
  },
  {
    title: "2. Initialize AuthForge",
    code: `import { AuthForge } from "@authforge/sdk";

const auth = new AuthForge({
  domain: "https://your-api.example.com",
  clientId: "app_your_client_id",
  redirectUri: "http://localhost:3000/callback",
  secret: process.env.AUTHFORGE_SECRET,
});`,
  },
  {
    title: "3. Add the middleware",
    code: `import express from "express";

const app = express();

// Login route — redirects to AuthForge hosted login
app.get("/login", auth.login());

// Callback route — exchanges the code for tokens
app.get("/callback", auth.callback());

// Logout route — clears the session
app.get("/logout", auth.logout());`,
  },
  {
    title: "4. Protect your routes",
    code: `// Require authentication on protected routes
app.get("/dashboard", auth.requireAuth(), (req, res) => {
  const user = req.auth;
  res.json({ message: \`Hello, \${user.email}!\` });
});`,
  },
];

export default function QuickStartPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quick Start</h1>
        <p className="mt-1 text-sm text-gray-500">
          Get up and running with AuthForge in minutes.
        </p>
      </div>

      {steps.map((step) => (
        <Card key={step.title}>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            {step.title}
          </h2>
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
            <code>{step.code}</code>
          </pre>
        </Card>
      ))}

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          5. Run your app
        </h2>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
          <code>node app.js</code>
        </pre>
        <p className="mt-3 text-sm text-gray-600">
          Visit{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-indigo-600">
            http://localhost:3000/login
          </code>{" "}
          to test the authentication flow.
        </p>
      </Card>
    </div>
  );
}
