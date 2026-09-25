"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";

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
        <Spinner size="lg" />
      </div>
    );
  }

  if (!developer) return null;

  return <>{children}</>;
}
