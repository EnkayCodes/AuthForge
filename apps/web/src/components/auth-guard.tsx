"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth-context";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { developer, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !developer) {
      router.replace("/dashboard/login");
    }
  }, [loading, developer, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!developer) return null;

  return <>{children}</>;
}
