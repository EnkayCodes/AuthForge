"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { apiFetch } from "../../../../../lib/api";
import { ConfirmDialog } from "../../../../../components/confirm-dialog";

interface Permission {
  id: string;
  key: string;
  description: string | null;
  createdAt: string;
}

export function PermissionsTab({ appId }: { appId: string }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);

  const fetchPermissions = useCallback(async () => {
    const { ok, data } = await apiFetch<{ permissions: Permission[] }>(`/applications/${appId}/permissions`);
    if (ok) setPermissions(data.permissions);
    setLoading(false);
  }, [appId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setError("");
    setCreating(true);

    try {
      const { ok, data } = await apiFetch(`/applications/${appId}/permissions`, {
        method: "POST",
        body: JSON.stringify({ key: key.trim(), description: description.trim() || undefined }),
      });

      if (!ok) {
        setError((data as { message?: string }).message ?? "Failed to create permission.");
        return;
      }

      setKey("");
      setDescription("");
      fetchPermissions();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(permissionId: string) {
    await apiFetch(`/applications/${appId}/permissions/${permissionId}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchPermissions();
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
      <form onSubmit={handleCreate} className="mb-6 space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Permission key (e.g. posts.create)"
            required
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? "Adding…" : "Add Permission"}
          </button>
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
      </form>

      {permissions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No permissions yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Key</th>
                <th className="px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {permissions.map((perm) => (
                <tr key={perm.id}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                    {perm.key}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {perm.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget(perm)}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Permission"
          message={`Delete permission "${deleteTarget.key}"? It will be removed from all roles.`}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
