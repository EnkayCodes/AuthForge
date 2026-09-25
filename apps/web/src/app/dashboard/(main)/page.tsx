"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateApplicationForm } from "./create-application-form";

interface Application {
  id: string;
  name: string;
  environment: string;
  clientId: string;
  createdAt: string;
}

const envBadge: Record<string, "default" | "warning" | "success"> = {
  development: "default",
  staging: "warning",
  production: "success",
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchApps = useCallback(async () => {
    const { ok, data } = await apiFetch<{ applications: Application[] }>("/applications");
    if (ok) setApps(data.applications);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Skeleton variant="text" width={180} />
          <Skeleton variant="rectangular" width={160} height={40} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} variant="rectangular" height={140} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <Button onClick={() => setShowCreate(true)}>Create Application</Button>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          illustration="shield"
          title="No applications yet"
          description="Create your first application to get started with AuthForge."
          action={{ label: "Create Application", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Link key={app.id} href={`/dashboard/applications/${app.id}`}>
              <Card hover>
                <div className="flex items-start justify-between">
                  <h2 className="font-semibold text-gray-900">{app.name}</h2>
                  <Badge variant={envBadge[app.environment] ?? "default"}>
                    {app.environment}
                  </Badge>
                </div>
                <p className="mt-2 font-mono text-xs text-gray-400">{app.clientId}</p>
                <p className="mt-3 text-xs text-gray-500">
                  Created {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateApplicationForm
          onCreated={() => { setShowCreate(false); fetchApps(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
