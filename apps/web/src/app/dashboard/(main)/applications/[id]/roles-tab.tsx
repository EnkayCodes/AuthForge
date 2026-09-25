"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Permission { id: string; key: string; description: string | null; }
interface Role { id: string; name: string; description: string | null; permissions: Permission[]; }

export function RolesTab({ appId }: { appId: string }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();

  const fetchRoles = useCallback(async () => {
    const { ok, data } = await apiFetch<{ roles: Role[] }>(`/applications/${appId}/roles`);
    if (ok) setRoles(data.roles);
    setLoading(false);
  }, [appId]);

  const fetchPermissions = useCallback(async () => {
    const { ok, data } = await apiFetch<{ permissions: Permission[] }>(`/applications/${appId}/permissions`);
    if (ok) setPermissions(data.permissions);
  }, [appId]);

  useEffect(() => { fetchRoles(); fetchPermissions(); }, [fetchRoles, fetchPermissions]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { ok, data } = await apiFetch(`/applications/${appId}/roles`, { method: "POST", body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }) });
      if (!ok) { toast("error", (data as { message?: string }).message ?? "Failed to create role."); return; }
      setName(""); setDescription(""); fetchRoles();
    } catch { toast("error", "Unable to reach the server."); } finally { setCreating(false); }
  }

  async function handleDelete(roleId: string) {
    await apiFetch(`/applications/${appId}/roles/${roleId}`, { method: "DELETE" });
    setDeleteTarget(null); fetchRoles(); toast("success", "Role deleted.");
  }

  async function attachPermission(roleId: string, permissionId: string) {
    await apiFetch(`/applications/${appId}/roles/${roleId}/permissions`, { method: "POST", body: JSON.stringify({ permissionId }) });
    fetchRoles();
  }

  async function detachPermission(roleId: string, permissionId: string) {
    await apiFetch(`/applications/${appId}/roles/${roleId}/permissions/${permissionId}`, { method: "DELETE" });
    fetchRoles();
  }

  if (loading) {
    return <div className="max-w-3xl">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} variant="rectangular" height={56} className="mb-3" />)}</div>;
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleCreate} className="mb-6 flex gap-3">
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name (e.g. admin)" required className="flex-1" />
        <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="flex-1" />
        <Button type="submit" loading={creating}>Add Role</Button>
      </form>

      {roles.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No roles yet.</p>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {roles.map((role) => {
              const expanded = expandedRole === role.id;
              const attachedIds = new Set(role.permissions.map((p) => p.id));
              const available = permissions.filter((p) => !attachedIds.has(p.id));
              return (
                <motion.div key={role.id} layout initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={reduceMotion ? { duration: 0 } : undefined} className="rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{role.name}</span>
                      {role.description && <span className="ml-2 text-sm text-gray-500">— {role.description}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" onClick={() => setExpandedRole(expanded ? null : role.id)}>{expanded ? "Collapse" : "Permissions"}</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(role)} className="text-red-600 hover:text-red-800">Delete</Button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      {role.permissions.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {role.permissions.map((p) => (
                            <Badge key={p.id} variant="info">
                              {p.key}
                              <button onClick={() => detachPermission(role.id, p.id)} className="ml-1 text-indigo-400 hover:text-red-500">&times;</button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      {available.length > 0 ? (
                        <select onChange={(e) => { if (e.target.value) { attachPermission(role.id, e.target.value); e.target.value = ""; } }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" defaultValue="">
                          <option value="" disabled>Attach permission…</option>
                          {available.map((p) => <option key={p.id} value={p.id}>{p.key}</option>)}
                        </select>
                      ) : (
                        <p className="text-xs text-gray-400">{permissions.length === 0 ? "Create permissions first." : "All permissions attached."}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {deleteTarget && <ConfirmDialog title="Delete Role" message={`Delete role "${deleteTarget.name}"? Users with this role will lose its permissions.`} confirmLabel="Delete" onConfirm={() => handleDelete(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
