"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
  const { toast } = useToast();

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
    setCreating(true);
    try {
      const { ok, data } = await apiFetch<{ apiKey: ApiKey; token: string; message?: string }>(
        `/applications/${appId}/keys`,
        { method: "POST", body: JSON.stringify({ label: label.trim() }) },
      );
      if (!ok) {
        toast("error", (data as { message?: string }).message ?? "Failed to create key.");
        return;
      }
      setNewToken(data.token);
      setLabel("");
      fetchKeys();
    } catch {
      toast("error", "Unable to reach the server.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    const { ok } = await apiFetch(`/applications/${appId}/keys/${keyId}`, { method: "DELETE" });
    if (!ok) {
      toast("error", "Failed to revoke API key.");
      return;
    }
    setRevokeTarget(null);
    fetchKeys();
    toast("success", "API key revoked.");
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <Skeleton variant="rectangular" height={44} className="mb-6" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} variant="rectangular" height={52} className="mb-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {newToken && (
        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-800">Store this API key now. It cannot be retrieved again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-yellow-100 px-3 py-2 font-mono text-xs text-yellow-900">
              {newToken}
            </code>
            <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(newToken)}>
              Copy
            </Button>
          </div>
          <button onClick={() => setNewToken(null)} className="mt-2 text-xs text-yellow-700 hover:text-yellow-900">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex gap-3">
        <Input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Key label (e.g. Production)"
          required
          className="flex-1"
        />
        <Button type="submit" loading={creating}>
          Issue Key
        </Button>
      </form>

      {keys.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No API keys yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                    <Badge variant={key.revokedAt ? "danger" : "success"}>{key.revokedAt ? "Revoked" : "Active"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revokedAt && (
                      <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(key)} className="text-red-600 hover:text-red-800">
                        Revoke
                      </Button>
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
