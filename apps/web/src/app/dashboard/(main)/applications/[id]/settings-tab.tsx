"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { ok, data } = await apiFetch(`/applications/${app.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, redirectUris, accessTokenTtl, refreshTokenTtl, requireVerifiedEmail }),
      });
      if (!ok) toast("error", (data as { message?: string }).message ?? "Failed to save.");
      else {
        toast("success", "Settings saved.");
        onUpdated();
      }
    } catch {
      toast("error", "Unable to reach the server.");
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

  async function handleDelete() {
    setDeleting(true);
    try {
      const { ok } = await apiFetch(`/applications/${app.id}`, { method: "DELETE" });
      if (ok) {
        onDeleted();
      } else {
        toast("error", "Failed to delete application.");
        setShowDelete(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSave} className="space-y-6">
        <Input label="Name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">Redirect URIs</label>
          {redirectUris.length > 0 && (
            <ul className="mb-2 space-y-1">
              {redirectUris.map((uri) => (
                <li key={uri} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
                  <span className="flex-1 font-mono text-xs">{uri}</span>
                  <button
                    type="button"
                    onClick={() => setRedirectUris(redirectUris.filter((u) => u !== uri))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              type="url"
              value={newUri}
              onChange={(e) => setNewUri(e.target.value)}
              placeholder="https://example.com/callback"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={addUri}>
              Add
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Access Token TTL"
            value={accessTokenTtl}
            onChange={(e) => setAccessTokenTtl(e.target.value)}
            placeholder="15m"
            hint="e.g. 15m, 1h, 24h"
          />
          <Input
            label="Refresh Token TTL"
            value={refreshTokenTtl}
            onChange={(e) => setRefreshTokenTtl(e.target.value)}
            placeholder="30d"
            hint="e.g. 7d, 30d, 90d"
          />
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

        <Button type="submit" loading={saving}>
          Save Changes
        </Button>
      </form>

      <div className="mt-12 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
        <p className="mt-1 text-sm text-gray-500">Permanently delete this application and all its data.</p>
        <Button variant="danger" className="mt-3" onClick={() => setShowDelete(true)}>
          Delete Application
        </Button>
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
