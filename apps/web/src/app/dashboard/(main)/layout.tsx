"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "../../../contexts/auth-context";
import { AuthGuard } from "../../../components/auth-guard";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
              {children}
            </main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
