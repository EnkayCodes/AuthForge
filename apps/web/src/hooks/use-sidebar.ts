"use client";

import { useState, useEffect, useCallback } from "react";

type SidebarMode = "full" | "icons" | "hidden";

export function useSidebar() {
  const [mode, setMode] = useState<SidebarMode>("full");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w >= 1024) setMode("full");
      else if (w >= 768) setMode("icons");
      else setMode("hidden");
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return { mode, mobileOpen, toggleMobile, closeMobile };
}
