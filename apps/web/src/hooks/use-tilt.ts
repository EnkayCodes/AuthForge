"use client";

import { useEffect, type RefObject } from "react";

export function useTilt(ref: RefObject<HTMLElement | null> | null) {
  useEffect(() => {
    const el = ref?.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function handleMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    function handleLeave() {
      if (!el) return;
      el.style.transition = "transform 0.3s ease";
      el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    }

    function handleEnter() {
      if (!el) return;
      el.style.transition = "none";
    }

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    el.addEventListener("mouseenter", handleEnter);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      el.removeEventListener("mouseenter", handleEnter);
    };
  }, [ref]);
}
