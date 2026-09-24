"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "../../../../../lib/api";
import { ConfirmDialog } from "../../../../../components/confirm-dialog";

interface Application {
  id: string;
  name: string;
  redirectUris: string[];
  accessTokenTtl: string;
  refreshTokenTtl: string;
  requireVerifiedEmail: boolean;
}

interface SettingsTabProps {
  app: Application;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function SettingsTab({ app, onUpdated, onDeleted }: SettingsTabProps) {
  const [name, setName] = useState(app.name);
  const [redirectUris, setRedirectUris] = useState<string[]>(app.redirectUris);
  const [newUri, setNewUri] = useState("");
  const [accessTokenTtl, setAccessTokenTtl] = useState(app.accessTokenTtl);
  const [refreshTokenTtl, setRefreshTokenTtl] = useState(app.refreshTokenTtl);
  const [requireVerifiedEmail, setRequireVerifiedEmail] = useState(app.requireVerifiedEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { ok, data } = await apiFetch(`/applications/${app.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          redirectUris,
          accessTokenTtl,
          refreshTokenTtl,
          requireVerifiedEmail,
        }),
      });

      if (!ok) {
        setError((data as { message?: string }).message ?? "Failed to save.");
      } else {
        setSuccess("Settings saved.");
        onUpdated();
      }
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  }

  function addUri() {
    const uri = newUri.trim();
    if (uri && !redirectUris.includes(uri)) {
      setRedirectUris([...redirectUris, uri]);
      setNewUri("");
    }
  }

  function removeUri(uri: string) {
    setRedirectUris(redirectUris.filter((u) => u !== uri));
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { ok } = await apiFetch(`/applications/${app.id}`, { method: "DELETE" });
      if (ok) onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
        )}

        <div>
          <label htmlFor="app-name" className="mb-1 block text-sm font-medium">Name</label>
          <input
            id="app-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Redirect URIs</label>
          {redirectUris.length > 0 && (
            <ul className="mb-2 space-y-1">
              {redirectUris.map((uri) => (
                <li key={uri} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
                  <span className="flex-1 font-mono text-xs">{uri}</span>
                  <button
                    type="button"
                    onClick={() => removeUri(uri)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="url"
              value={newUri}
              onChange={(e) => setNewUri(e.target.value)}
              placeholder="https://example.com/callback"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={addUri}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="access-ttl" className="mb-1 block text-sm font-medium">
              Access Token TTL
            </label>
            <input
              id="access-ttl"
              type="text"
              value={accessTokenTtl}
              onChange={(e) => setAccessTokenTtl(e.target.value)}
              placeholder="15m"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-400">e.g. 15m, 1h, 24h</p>
          </div>
          <div>
            <label htmlFor="refresh-ttl" className="mb-1 block text-sm font-medium">
              Refresh Token TTL
            </label>
            <input
              id="refresh-ttl"
              type="text"
              value={refreshTokenTtl}
              onChange={(e) => setRefreshTokenTtl(e.target.value)}
              placeholder="30d"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-400">e.g. 7d, 30d, 90d</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="require-verified"
            type="checkbox"
            checked={requireVerifiedEmail}
            onChange={(e) => setRequireVerifiedEmail(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="require-verified" className="text-sm font-medium">
            Require verified email before login
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      <div className="mt-12 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
        <p className="mt-1 text-sm text-gray-500">
          Permanently delete this application and all its data.
        </p>
        <button
          onClick={() => setShowDelete(true)}
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete Application
        </button>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete Application"
          message={`Are you sure you want to delete "${app.name}"? This action cannot be undone.`}
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
