"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { apiFetch } from "../../../../../lib/api";
import { ConfirmDialog } from "../../../../../components/confirm-dialog";

interface ApiKey {
  id: string;
  keyId: string;
  label: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export function ApiKeysTab({ appId }: { appId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [error, setError] = useState("");

  const fetchKeys = useCallback(async () => {
    const { ok, data } = await apiFetch<{ apiKeys: ApiKey[] }>(`/applications/${appId}/keys`);
    if (ok) setKeys(data.apiKeys);
    setLoading(false);
  }, [appId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setError("");
    setCreating(true);

    try {
      const { ok, data } = await apiFetch<{ apiKey: ApiKey; token: string; message?: string }>(
        `/applications/${appId}/keys`,
        { method: "POST", body: JSON.stringify({ label: label.trim() }) },
      );

      if (!ok) {
        setError((data as { message?: string }).message ?? "Failed to create key.");
        return;
      }

      setNewToken(data.token);
      setLabel("");
      fetchKeys();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    await apiFetch(`/applications/${appId}/keys/${keyId}`, { method: "DELETE" });
    setRevokeTarget(null);
    fetchKeys();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {newToken && (
        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-800">
            Store this API key now. It cannot be retrieved again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-yellow-100 px-3 py-2 font-mono text-xs text-yellow-900">
              {newToken}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(newToken)}
              className="rounded-lg border border-yellow-400 px-3 py-1.5 text-xs font-medium text-yellow-800 hover:bg-yellow-100"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setNewToken(null)}
            className="mt-2 text-xs text-yellow-700 hover:text-yellow-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex gap-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Key label (e.g. Production)"
          required
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {creating ? "Issuing…" : "Issue Key"}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {keys.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No API keys yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Label</th>
                <th className="px-4 py-3 font-medium text-gray-600">Key ID</th>
                <th className="px-4 py-3 font-medium text-gray-600">Last Used</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{key.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{key.keyId}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {key.revokedAt ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Revoked
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revokedAt && (
                      <button
                        onClick={() => setRevokeTarget(key)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revokeTarget && (
        <ConfirmDialog
          title="Revoke API Key"
          message={`Revoke "${revokeTarget.label}"? Applications using this key will lose access.`}
          confirmLabel="Revoke"
          onConfirm={() => handleRevoke(revokeTarget.id)}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
