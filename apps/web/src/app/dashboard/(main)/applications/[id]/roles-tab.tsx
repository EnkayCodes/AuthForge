"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { apiFetch } from "../../../../../lib/api";
import { ConfirmDialog } from "../../../../../components/confirm-dialog";

interface Permission {
  id: string;
  key: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
}

export function RolesTab({ appId }: { appId: string }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    const { ok, data } = await apiFetch<{ roles: Role[] }>(`/applications/${appId}/roles`);
    if (ok) setRoles(data.roles);
    setLoading(false);
  }, [appId]);

  const fetchPermissions = useCallback(async () => {
    const { ok, data } = await apiFetch<{ permissions: Permission[] }>(`/applications/${appId}/permissions`);
    if (ok) setPermissions(data.permissions);
  }, [appId]);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setCreating(true);

    try {
      const { ok, data } = await apiFetch(`/applications/${appId}/roles`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });

      if (!ok) {
        setError((data as { message?: string }).message ?? "Failed to create role.");
        return;
      }

      setName("");
      setDescription("");
      fetchRoles();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(roleId: string) {
    await apiFetch(`/applications/${appId}/roles/${roleId}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchRoles();
  }

  async function attachPermission(roleId: string, permissionId: string) {
    await apiFetch(`/applications/${appId}/roles/${roleId}/permissions`, {
      method: "POST",
      body: JSON.stringify({ permissionId }),
    });
    fetchRoles();
  }

  async function detachPermission(roleId: string, permissionId: string) {
    await apiFetch(`/applications/${appId}/roles/${roleId}/permissions/${permissionId}`, {
      method: "DELETE",
    });
    fetchRoles();
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Role name (e.g. admin)"
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
            {creating ? "Adding…" : "Add Role"}
          </button>
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
      </form>

      {roles.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No roles yet.</p>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const expanded = expandedRole === role.id;
            const attachedIds = new Set(role.permissions.map((p) => p.id));
            const available = permissions.filter((p) => !attachedIds.has(p.id));

            return (
              <div key={role.id} className="rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium text-gray-900">{role.name}</span>
                    {role.description && (
                      <span className="ml-2 text-sm text-gray-500">— {role.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedRole(expanded ? null : role.id)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {expanded ? "Collapse" : "Permissions"}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(role)}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {role.permissions.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {role.permissions.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                          >
                            {p.key}
                            <button
                              onClick={() => detachPermission(role.id, p.id)}
                              className="ml-1 text-indigo-400 hover:text-red-500"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {available.length > 0 ? (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            attachPermission(role.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Attach permission…
                        </option>
                        {available.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.key}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-gray-400">
                        {permissions.length === 0
                          ? "Create permissions first."
                          : "All permissions attached."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Role"
          message={`Delete role "${deleteTarget.name}"? Users with this role will lose its permissions.`}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
