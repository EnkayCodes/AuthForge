"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

const sections = [
  {
    id: "authentication",
    title: "Authentication",
    endpoints: [
      {
        method: "POST",
        path: "/developers/signup",
        description: "Create a new developer account",
        body: '{ "email": "string", "password": "string", "name": "string" }',
        response: '{ "developer": { "id", "email", "name" }, "token": "string" }',
      },
      {
        method: "POST",
        path: "/developers/login",
        description: "Sign in to your developer account",
        body: '{ "email": "string", "password": "string" }',
        response: '{ "developer": { "id", "email", "name" }, "token": "string" }',
      },
      {
        method: "GET",
        path: "/developers/me",
        description: "Get current developer profile",
        response: '{ "developer": { "id", "email", "name" } }',
      },
    ],
  },
  {
    id: "applications",
    title: "Applications",
    endpoints: [
      {
        method: "GET",
        path: "/applications",
        description: "List all applications",
        response: '{ "applications": [...] }',
      },
      {
        method: "POST",
        path: "/applications",
        description: "Create a new application",
        body: '{ "name": "string", "environment": "development | staging | production" }',
        response: '{ "application": { "id", "name", "clientId", ... } }',
      },
      {
        method: "PATCH",
        path: "/applications/:id",
        description: "Update application settings",
        body: '{ "name?": "string", "redirectUris?": ["string"], ... }',
        response: '{ "application": { ... } }',
      },
      {
        method: "DELETE",
        path: "/applications/:id",
        description: "Delete an application",
        response: "204 No Content",
      },
    ],
  },
  {
    id: "api-keys",
    title: "API Keys",
    endpoints: [
      {
        method: "POST",
        path: "/applications/:id/keys",
        description: "Issue a new API key",
        response: '{ "key": { "id", "prefix", "token" } }',
      },
      {
        method: "GET",
        path: "/applications/:id/keys",
        description: "List API keys for an application",
        response: '{ "keys": [...] }',
      },
      {
        method: "DELETE",
        path: "/applications/:id/keys/:keyId",
        description: "Revoke an API key",
        response: "204 No Content",
      },
    ],
  },
  {
    id: "oauth",
    title: "OAuth / End-User Auth",
    endpoints: [
      {
        method: "GET",
        path: "/authorize",
        description: "Start OAuth2 PKCE authorization flow",
        body: "Query: client_id, redirect_uri, response_type, code_challenge, code_challenge_method, state",
        response: "Redirect to login page",
      },
      {
        method: "POST",
        path: "/token",
        description: "Exchange authorization code for tokens",
        body: '{ "grant_type": "authorization_code", "code", "redirect_uri", "client_id", "code_verifier" }',
        response: '{ "access_token", "refresh_token", "token_type", "expires_in" }',
      },
    ],
  },
  {
    id: "rbac",
    title: "Roles & Permissions",
    endpoints: [
      {
        method: "POST",
        path: "/applications/:id/roles",
        description: "Create a role",
        body: '{ "name": "string", "description?": "string" }',
        response: '{ "role": { "id", "name", "description" } }',
      },
      {
        method: "POST",
        path: "/applications/:id/permissions",
        description: "Create a permission",
        body: '{ "name": "string", "description?": "string" }',
        response: '{ "permission": { "id", "name", "description" } }',
      },
      {
        method: "POST",
        path: "/applications/:id/roles/:roleId/permissions",
        description: "Attach a permission to a role",
        body: '{ "permissionId": "string" }',
        response: "204 No Content",
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-indigo-100 text-indigo-700",
  PATCH: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
};

export default function DocsPage() {
  const [active, setActive] = useState("authentication");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Reference for the AuthForge REST API. All endpoints require a
          developer JWT unless noted otherwise.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-px">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active === s.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {sections
          .filter((s) => s.id === active)
          .flatMap((s) => s.endpoints)
          .map((ep) => (
            <Card key={ep.method + ep.path}>
              <div className="flex items-start gap-3">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${methodColors[ep.method] ?? "bg-gray-100 text-gray-700"}`}
                >
                  {ep.method}
                </span>
                <div className="flex-1">
                  <code className="text-sm font-semibold text-gray-900">
                    {ep.path}
                  </code>
                  <p className="mt-1 text-sm text-gray-500">{ep.description}</p>

                  {ep.body && (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase text-gray-400">
                        {ep.method === "GET" ? "Parameters" : "Request Body"}
                      </p>
                      <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                        {ep.body}
                      </pre>
                    </div>
                  )}

                  {ep.response && (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase text-gray-400">
                        Response
                      </p>
                      <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                        {ep.response}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
