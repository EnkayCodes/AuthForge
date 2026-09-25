"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsTab } from "./settings-tab";
import { ApiKeysTab } from "./api-keys-tab";
import { RolesTab } from "./roles-tab";
import { PermissionsTab } from "./permissions-tab";
import { AuditTab } from "./audit-tab";

interface Application {
  id: string;
  name: string;
  environment: string;
  clientId: string;
  redirectUris: string[];
  accessTokenTtl: string;
  refreshTokenTtl: string;
  requireVerifiedEmail: boolean;
  createdAt: string;
}

const tabs = ["Settings", "API Keys", "Roles", "Permissions", "Audit Log"] as const;
type Tab = (typeof tabs)[number];

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Settings");
  const router = useRouter();

  const fetchApp = useCallback(async () => {
    const { ok, data } = await apiFetch<{ application: Application }>(`/applications/${id}`);
    if (ok) setApp(data.application);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchApp();
  }, [fetchApp]);

  if (loading) {
    return (
      <div>
        <Skeleton variant="text" width={120} className="mb-2" />
        <Skeleton variant="text" width={250} height={28} className="mb-1" />
        <Skeleton variant="text" width={180} className="mb-6" />
        <Skeleton variant="rectangular" height={40} className="mb-6" />
        <Skeleton variant="rectangular" height={300} />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-gray-500">Application not found.</p>
        <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mt-2">
          Back to applications
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.push("/dashboard")} className="mb-2 text-sm text-gray-500 hover:text-gray-700">
          &larr; Applications
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
        <p className="mt-1 font-mono text-xs text-gray-400">{app.clientId}</p>
      </div>

      <div className="mb-6 overflow-x-auto border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "Settings" && <SettingsTab app={app} onUpdated={fetchApp} onDeleted={() => router.push("/dashboard")} />}
      {activeTab === "API Keys" && <ApiKeysTab appId={app.id} />}
      {activeTab === "Roles" && <RolesTab appId={app.id} />}
      {activeTab === "Permissions" && <PermissionsTab appId={app.id} />}
      {activeTab === "Audit Log" && <AuditTab appId={app.id} />}
    </div>
  );
}
