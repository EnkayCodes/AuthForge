"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Applications",
    href: "/dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    match: (path: string) => path === "/dashboard" || path.startsWith("/dashboard/applications"),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    match: (path: string) => path.startsWith("/dashboard/settings"),
  },
];

type SidebarMode = "full" | "icons" | "hidden";

interface SidebarProps {
  mode: SidebarMode;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mode, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  if (mode === "hidden" && !mobileOpen) return null;

  const isOverlay = mode === "hidden" && mobileOpen;
  const collapsed = mode === "icons";

  return (
    <>
      {isOverlay && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`flex flex-col border-r border-gray-200 bg-white ${
          isOverlay
            ? "fixed inset-y-0 left-0 z-50 w-64"
            : collapsed
              ? "w-16"
              : "w-64"
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-gray-200 ${
            collapsed ? "justify-center px-2" : "px-6"
          }`}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={isOverlay ? onClose : undefined}
          >
            {collapsed ? (
              <img
                src="/shield-icon.svg"
                alt="AuthForge"
                className="h-8 w-8"
                style={{ animation: "logoReveal 0.6s ease-out" }}
              />
            ) : (
              <img
                src="/logo.svg"
                alt="AuthForge"
                className="h-7"
                style={{ animation: "logoReveal 0.6s ease-out" }}
              />
            )}
          </Link>
        </div>

        <nav className={`flex-1 space-y-1 py-4 ${collapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={isOverlay ? onClose : undefined}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`flex items-center rounded-lg transition-colors ${
                  collapsed ? "justify-center p-2" : "gap-3 px-3 py-2"
                } text-sm font-medium ${
                  active
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
