"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AuthProvider } from "@/contexts/auth-context";
import { ToastProvider } from "@/contexts/toast-context";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useSidebar } from "@/hooks/use-sidebar";

function DashboardShell({ children }: { children: ReactNode }) {
  const { mode, mobileOpen, toggleMobile, closeMobile } = useSidebar();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-screen">
      <Sidebar mode={mode} mobileOpen={mobileOpen} onClose={closeMobile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={toggleMobile} showMenu={mode === "hidden"} mobileOpen={mobileOpen} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <ToastProvider>
          <DashboardShell>{children}</DashboardShell>
        </ToastProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
