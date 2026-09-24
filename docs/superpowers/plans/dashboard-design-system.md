# Dashboard Design System & Visual Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the AuthForge developer dashboard from a functional prototype into a portfolio-grade product with an internal design system, indigo brand identity, 3D animations, and responsive layout.

**Architecture:** Reusable UI components in `apps/web/src/components/ui/`, 3D scenes in `apps/web/src/components/three/`, Framer Motion for 2D animations, React Three Fiber for 3D scenes, CSS for lightweight effects. All pages import shared components instead of duplicating Tailwind classes.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS v4, Framer Motion, Three.js + @react-three/fiber + @react-three/drei

## Global Constraints

- Primary brand color: indigo-600 (#4F46E5) — replaces all blue-600 usage
- All UI components use `indigo-600` as the primary accent
- All components respect `prefers-reduced-motion`
- R3F Canvas components must use `next/dynamic` with `ssr: false`
- No new runtime dependencies beyond: `framer-motion`, `three`, `@react-three/fiber`, `@react-three/drei`
- Path alias `@/*` maps to `./src/*` (defined in tsconfig.json)
- Existing `ConfirmDialog` API (`title`, `message`, `confirmLabel`, `onConfirm`, `onCancel`) must be preserved
- No dark mode, no i18n, no real-time updates, no landing page changes

---

### Task 1: Dependencies + Brand Assets + Global Color Swap

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/app/globals.css`
- Create: `apps/web/public/logo.svg`
- Create: `apps/web/public/icon.svg`
- Create: `apps/web/src/app/icon.svg`
- Modify: all `.tsx` files under `apps/web/src/` (blue → indigo replacement)

**Interfaces:**
- Consumes: nothing
- Produces: brand assets at `/logo.svg` and `/icon.svg` (public), favicon at `src/app/icon.svg`, all existing files using indigo instead of blue

- [ ] **Step 1: Install new dependencies**

```bash
cd apps/web
pnpm add framer-motion three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

- [ ] **Step 2: Create the icon mark SVG**

Create `apps/web/public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" fill="none">
  <path d="M50 4L92 24V56C92 82 50 112 50 112S8 82 8 56V24L50 4Z" fill="#4F46E5"/>
  <circle cx="50" cy="46" r="10" fill="white"/>
  <rect x="46.5" y="54" width="7" height="22" rx="3.5" fill="white"/>
  <rect x="53.5" y="62" width="8" height="4" rx="2" fill="white"/>
  <rect x="53.5" y="70" width="6" height="4" rx="2" fill="white"/>
</svg>
```

- [ ] **Step 3: Create the full logo SVG**

Create `apps/web/public/logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 36" fill="none">
  <g transform="translate(2,0) scale(0.3)">
    <path d="M50 4L92 24V56C92 82 50 112 50 112S8 82 8 56V24L50 4Z" fill="#4F46E5"/>
    <circle cx="50" cy="46" r="10" fill="white"/>
    <rect x="46.5" y="54" width="7" height="22" rx="3.5" fill="white"/>
    <rect x="53.5" y="62" width="8" height="4" rx="2" fill="white"/>
    <rect x="53.5" y="70" width="6" height="4" rx="2" fill="white"/>
  </g>
  <text x="40" y="26" font-family="system-ui,-apple-system,sans-serif" font-size="21" font-weight="700" fill="#111827" letter-spacing="-0.02em">AuthForge</text>
</svg>
```

- [ ] **Step 4: Create the favicon**

Copy `apps/web/public/icon.svg` to `apps/web/src/app/icon.svg` (Next.js App Router automatically uses `icon.svg` in the app directory as the favicon).

- [ ] **Step 5: Add logo reveal keyframe to globals.css**

Replace the contents of `apps/web/src/app/globals.css` with:

```css
@import "tailwindcss";

@keyframes logoReveal {
  from {
    transform: rotateY(-90deg);
  }
  to {
    transform: rotateY(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Global blue → indigo replacement**

Run this from the repo root to replace all blue color references with indigo across every `.tsx` file in the web app:

```bash
cd apps/web/src
find . -name "*.tsx" -exec sed -i \
  -e 's/blue-600/indigo-600/g' \
  -e 's/blue-700/indigo-700/g' \
  -e 's/blue-500/indigo-500/g' \
  -e 's/blue-50/indigo-50/g' \
  -e 's/blue-100/indigo-100/g' \
  -e 's/blue-400/indigo-400/g' \
  -e 's/blue-800/indigo-800/g' \
  {} +
```

Verify no `blue-` references remain (excluding the Google button SVG `fill="#4285F4"` which is Google's brand color):

```bash
grep -rn "blue-" apps/web/src/ --include="*.tsx" | grep -v "#4285F4"
```

Expected: no output.

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @authforge/web typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/public/logo.svg apps/web/public/icon.svg apps/web/src/app/icon.svg apps/web/src/app/globals.css apps/web/src/
git commit -m "feat(web): add brand assets and swap blue to indigo palette"
```

---

### Task 2: Foundation UI Components (Button, Input, Select, Badge, Spinner, Skeleton)

**Files:**
- Create: `apps/web/src/components/ui/spinner.tsx`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/select.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/skeleton.tsx`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `Spinner({ size?: "sm" | "md" | "lg" })` — used by Button, AuthGuard, loading states
  - `Button({ variant?, size?, loading?, ...HTMLButtonAttributes })` — used everywhere
  - `Input({ label?, error?, hint?, ...HTMLInputAttributes })` — used in all forms
  - `Select({ label?, error?, options, ...HTMLSelectAttributes })` — used in create-app form
  - `Badge({ variant?, children })` — used in app cards, API key status
  - `Skeleton({ variant?, width?, height?, lines?, className? })` — used in loading states

- [ ] **Step 1: Create Spinner component**

Create `apps/web/src/components/ui/spinner.tsx`:

```tsx
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<string, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-4",
  lg: "h-8 w-8 border-4",
};

export function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-gray-200 border-t-indigo-600 ${sizeClasses[size]}`}
      role="status"
      aria-label="Loading"
    />
  );
}
```

- [ ] **Step 2: Create Button component**

Create `apps/web/src/components/ui/button.tsx`:

```tsx
"use client";

import { forwardRef } from "react";
import { Spinner } from "./spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
  secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", loading, disabled, children, className = "", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  },
);
```

- [ ] **Step 3: Create Input component**

Create `apps/web/src/components/ui/input.tsx`:

```tsx
"use client";

import { forwardRef, useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, hint, className = "", id: providedId, ...props }, ref) {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-900">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
    );
  },
);
```

- [ ] **Step 4: Create Select component**

Create `apps/web/src/components/ui/select.tsx`:

```tsx
"use client";

import { forwardRef, useId } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, options, className = "", id: providedId, ...props }, ref) {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-900">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
```

- [ ] **Step 5: Create Badge component**

Create `apps/web/src/components/ui/badge.tsx`:

```tsx
interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-indigo-100 text-indigo-700",
};

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 6: Create Skeleton component**

Create `apps/web/src/components/ui/skeleton.tsx`:

```tsx
interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  className = "",
}: SkeletonProps) {
  const base = "animate-pulse bg-gray-200";

  if (variant === "circular") {
    return (
      <div
        className={`${base} rounded-full ${className}`}
        style={{ width: width ?? 40, height: height ?? width ?? 40 }}
      />
    );
  }

  if (variant === "rectangular") {
    return (
      <div
        className={`${base} rounded-lg ${className}`}
        style={{ width: width ?? "100%", height: height ?? 80 }}
      />
    );
  }

  return (
    <div className={`space-y-2 ${className}`} style={{ width: width ?? "100%" }}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`${base} h-4 rounded`}
          style={{ width: i === lines - 1 && lines > 1 ? "75%" : "100%" }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @authforge/web typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/ui/
git commit -m "feat(web): add foundation UI components (Button, Input, Select, Badge, Spinner, Skeleton)"
```

---

### Task 3: Card Component + useTilt Hook

**Files:**
- Create: `apps/web/src/hooks/use-tilt.ts`
- Create: `apps/web/src/components/ui/card.tsx`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `useTilt(ref: RefObject<HTMLElement | null> | null): void` — attaches CSS perspective tilt to an element
  - `Card({ children, hover?, className? })` — card container with optional 3D tilt on hover

- [ ] **Step 1: Create useTilt hook**

Create `apps/web/src/hooks/use-tilt.ts`:

```ts
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
```

- [ ] **Step 2: Create Card component**

Create `apps/web/src/components/ui/card.tsx`:

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { useTilt } from "@/hooks/use-tilt";

interface CardProps {
  children: ReactNode;
  hover?: boolean;
  className?: string;
}

export function Card({ children, hover, className = "" }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(hover ? ref : null);

  return (
    <div
      ref={ref}
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${
        hover ? "transition-shadow hover:shadow-md" : ""
      } ${className}`}
      style={hover ? { transformStyle: "preserve-3d" } : undefined}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @authforge/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/use-tilt.ts apps/web/src/components/ui/card.tsx
git commit -m "feat(web): add Card component with 3D tilt hover effect"
```

---

### Task 4: Dialog + ConfirmDialog Migration

**Files:**
- Create: `apps/web/src/components/ui/dialog.tsx`
- Modify: `apps/web/src/components/confirm-dialog.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button`
- Produces:
  - `Dialog({ open, onClose, title, children, actions? })` — accessible modal with Framer Motion animation, focus trap, Escape key
  - `ConfirmDialog({ title, message, confirmLabel?, onConfirm, onCancel })` — same external API as before, now wraps Dialog

- [ ] **Step 1: Create Dialog component**

Create `apps/web/src/components/ui/dialog.tsx`:

```tsx
"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (open && panelRef.current) {
      const first = panelRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            className="fixed inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
          >
            <h3 id="dialog-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
            <div className="mt-2">{children}</div>
            {actions && <div className="mt-6 flex justify-end gap-3">{actions}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Rewrite ConfirmDialog to wrap Dialog**

Replace `apps/web/src/components/confirm-dialog.tsx` with:

```tsx
"use client";

import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open
      onClose={onCancel}
      title={title}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Dialog>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @authforge/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/dialog.tsx apps/web/src/components/confirm-dialog.tsx
git commit -m "feat(web): add Dialog component and migrate ConfirmDialog"
```

---

### Task 5: Toast System

**Files:**
- Create: `apps/web/src/components/ui/toast.tsx`
- Create: `apps/web/src/contexts/toast-context.tsx`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `ToastProvider({ children })` — wraps app, manages toast queue
  - `useToast(): { toast(type: "success" | "error" | "info", message: string): void }` — call from any component
  - `ToastContainer({ toasts, onDismiss })` — renders toast stack (used internally by ToastProvider)

- [ ] **Step 1: Create ToastContainer component**

Create `apps/web/src/components/ui/toast.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const borderColors: Record<Toast["type"], string> = {
  success: "border-l-green-500",
  error: "border-l-red-500",
  info: "border-l-indigo-500",
};

const iconColors: Record<Toast["type"], string> = {
  success: "text-green-600",
  error: "text-red-600",
  info: "text-indigo-600",
};

const icons: Record<Toast["type"], string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className={`flex w-80 items-start gap-3 rounded-lg border border-l-4 bg-white p-4 shadow-lg ${borderColors[t.type]}`}
          >
            <span className={`text-lg font-bold leading-none ${iconColors[t.type]}`}>
              {icons[t.type]}
            </span>
            <p className="flex-1 text-sm text-gray-700">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Create ToastProvider and useToast**

Create `apps/web/src/contexts/toast-context.tsx`:

```tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { ToastContainer } from "@/components/ui/toast";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextValue {
  toast: (type: Toast["type"], message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @authforge/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/toast.tsx apps/web/src/contexts/toast-context.tsx
git commit -m "feat(web): add Toast notification system with Framer Motion"
```

---

### Task 6: 3D Scenes + EmptyState

**Files:**
- Create: `apps/web/src/components/three/shield-scene.tsx`
- Create: `apps/web/src/components/three/auth-scene.tsx`
- Create: `apps/web/src/components/ui/empty-state.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button`
- Produces:
  - `ShieldScene({ size?: "large" | "small" })` — 3D rotating shield (R3F Canvas)
  - `AuthScene({ subtitle, children })` — split layout with 3D scene for auth pages
  - `EmptyState({ title, description, action?, illustration? })` — centered empty state with optional 3D illustration

- [ ] **Step 1: Create ShieldScene component**

Create `apps/web/src/components/three/shield-scene.tsx`:

```tsx
"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduced;
}

function ShieldMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const reducedMotion = useReducedMotion();

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.8);
    shape.bezierCurveTo(0.6, 1.8, 1.2, 1.5, 1.4, 1.2);
    shape.lineTo(1.4, 0.2);
    shape.bezierCurveTo(1.4, -0.8, 0, -1.8, 0, -1.8);
    shape.bezierCurveTo(0, -1.8, -1.4, -0.8, -1.4, 0.2);
    shape.lineTo(-1.4, 1.2);
    shape.bezierCurveTo(-1.2, 1.5, -0.6, 1.8, 0, 1.8);

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
    });
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current || reducedMotion) return;
    meshRef.current.rotation.y += delta * 0.3;
    meshRef.current.position.y = Math.sin(Date.now() * 0.0005) * 0.1;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color="#4F46E5" metalness={0.3} roughness={0.6} />
    </mesh>
  );
}

interface ShieldSceneProps {
  size?: "large" | "small";
}

export function ShieldScene({ size = "large" }: ShieldSceneProps) {
  return (
    <div style={{ width: "100%", height: size === "large" ? "100%" : 200 }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <ShieldMesh />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: Create AuthScene layout component**

Create `apps/web/src/components/three/auth-scene.tsx`:

```tsx
"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";

const ShieldScene = dynamic(
  () => import("./shield-scene").then((m) => ({ default: m.ShieldScene })),
  { ssr: false },
);

interface AuthSceneProps {
  subtitle: string;
  children: ReactNode;
}

export function AuthScene({ subtitle, children }: AuthSceneProps) {
  return (
    <main className="flex min-h-screen">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <img src="/logo.svg" alt="AuthForge" className="mx-auto h-8" />
            <p className="mt-3 text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-lg">{children}</div>
        </div>
      </div>
      <div className="hidden items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 md:flex md:flex-1">
        <ShieldScene size="large" />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create EmptyState component**

Create `apps/web/src/components/ui/empty-state.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import { Button } from "./button";

const ShieldScene = dynamic(
  () =>
    import("@/components/three/shield-scene").then((m) => ({
      default: m.ShieldScene,
    })),
  { ssr: false },
);

interface EmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  illustration?: "shield" | "none";
}

export function EmptyState({
  title,
  description,
  action,
  illustration,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {illustration === "shield" && (
        <div className="mb-6 h-[200px] w-[200px]">
          <ShieldScene size="small" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @authforge/web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/three/ apps/web/src/components/ui/empty-state.tsx
git commit -m "feat(web): add 3D shield scene, auth layout, and EmptyState"
```

---

### Task 7: Dashboard Shell Refactor (Layout, Sidebar, Topbar, AuthGuard)

**Files:**
- Create: `apps/web/src/hooks/use-sidebar.ts`
- Modify: `apps/web/src/components/auth-guard.tsx`
- Modify: `apps/web/src/app/dashboard/(main)/sidebar.tsx`
- Modify: `apps/web/src/app/dashboard/(main)/topbar.tsx`
- Modify: `apps/web/src/app/dashboard/(main)/layout.tsx`

**Interfaces:**
- Consumes: `Spinner` from `@/components/ui/spinner`, `Button` from `@/components/ui/button`, `ToastProvider` from `@/contexts/toast-context`, `useSidebar` hook
- Produces: responsive dashboard shell with collapsible sidebar, hamburger menu on mobile, page transitions, toast support

- [ ] **Step 1: Create useSidebar hook**

Create `apps/web/src/hooks/use-sidebar.ts`:

```ts
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
```

- [ ] **Step 2: Rewrite AuthGuard**

Replace `apps/web/src/components/auth-guard.tsx` with:

```tsx
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
```

- [ ] **Step 3: Rewrite Sidebar**

Replace `apps/web/src/app/dashboard/(main)/sidebar.tsx` with:

```tsx
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
        <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
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
                src="/icon.svg"
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
```

- [ ] **Step 4: Rewrite Topbar**

Replace `apps/web/src/app/dashboard/(main)/topbar.tsx` with:

```tsx
"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export function Topbar({ onMenuClick, showMenu }: TopbarProps) {
  const { developer, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div>
        {showMenu && (
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Open menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="max-w-[200px] truncate text-sm text-gray-600">
          {developer?.email}
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Rewrite dashboard layout**

Replace `apps/web/src/app/dashboard/(main)/layout.tsx` with:

```tsx
"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/auth-context";
import { ToastProvider } from "@/contexts/toast-context";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useSidebar } from "@/hooks/use-sidebar";

function DashboardShell({ children }: { children: ReactNode }) {
  const { mode, mobileOpen, toggleMobile, closeMobile } = useSidebar();
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      <Sidebar mode={mode} mobileOpen={mobileOpen} onClose={closeMobile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={toggleMobile} showMenu={mode === "hidden"} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
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
```

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @authforge/web typecheck
```

- [ ] **Step 7: Start dev server and verify dashboard shell**

```bash
pnpm dev:web
```

Open `http://localhost:3000/dashboard/login`. Verify:
- AuthForge logo appears above the login form
- Login form uses indigo accent colors
- After login, sidebar shows logo with reveal animation
- Sidebar collapses to icons on tablet widths (768-1023px)
- Sidebar becomes hamburger overlay on mobile widths (<768px)
- Topbar shows hamburger button on mobile
- Page transitions animate on route change

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/hooks/use-sidebar.ts apps/web/src/components/auth-guard.tsx apps/web/src/app/dashboard/\(main\)/sidebar.tsx apps/web/src/app/dashboard/\(main\)/topbar.tsx apps/web/src/app/dashboard/\(main\)/layout.tsx
git commit -m "feat(web): refactor dashboard shell with responsive sidebar, logo, and page transitions"
```

---

### Task 8: Auth Pages Refactor

**Files:**
- Modify: `apps/web/src/app/(auth)/login/page.tsx`
- Modify: `apps/web/src/app/(auth)/login/login-form.tsx`
- Modify: `apps/web/src/app/(auth)/signup/page.tsx`
- Modify: `apps/web/src/app/(auth)/signup/signup-form.tsx`
- Modify: `apps/web/src/app/(auth)/forgot-password/page.tsx`
- Modify: `apps/web/src/app/(auth)/forgot-password/forgot-password-form.tsx`
- Modify: `apps/web/src/app/(auth)/reset-password/page.tsx`
- Modify: `apps/web/src/app/(auth)/reset-password/reset-password-form.tsx`
- Modify: `apps/web/src/app/dashboard/login/page.tsx`
- Modify: `apps/web/src/app/dashboard/login/login-form.tsx`
- Modify: `apps/web/src/app/dashboard/signup/page.tsx`
- Modify: `apps/web/src/app/dashboard/signup/signup-form.tsx`

**Interfaces:**
- Consumes: `AuthScene` from `@/components/three/auth-scene`, `Input` from `@/components/ui/input`, `Button` from `@/components/ui/button`
- Produces: all auth pages wrapped in AuthScene with 3D shield, using shared Input/Button components

This task refactors all 12 auth-related files to:
1. Wrap pages in `AuthScene` layout (split form + 3D on desktop, stacked on mobile)
2. Replace raw `<input>` elements with `<Input>` component
3. Replace raw `<button>` elements with `<Button>` component
4. All colors are already indigo from Task 1

- [ ] **Step 1: Refactor OAuth login page**

Replace `apps/web/src/app/(auth)/login/page.tsx` — the only change is wrapping the happy path in `<AuthScene>` instead of the manual centered layout:

```tsx
import { AuthScene } from "@/components/three/auth-scene";
import { LoginForm } from "./login-form";

interface SearchParams {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  code_challenge?: string;
  scope?: string;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!params.client_id || !params.redirect_uri || !params.state || !params.code_challenge) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-xl font-semibold text-red-600">Invalid Request</h1>
          <p className="text-sm text-gray-600">
            Missing required authorization parameters. This page should be
            accessed via an application&apos;s login flow.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthScene subtitle="Sign in to continue">
      <LoginForm
        clientId={params.client_id}
        redirectUri={params.redirect_uri}
        state={params.state}
        codeChallenge={params.code_challenge}
        scope={params.scope ?? ""}
      />
    </AuthScene>
  );
}
```

- [ ] **Step 2: Refactor OAuth login form**

Replace `apps/web/src/app/(auth)/login/login-form.tsx` — swap raw inputs/buttons for shared components. Keep the Google OAuth button as-is (it's a link with specific styling). The form logic is unchanged:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface LoginFormProps {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
}

export function LoginForm({ clientId, redirectUri, state, codeChallenge, scope }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/oauth/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, redirect_uri: redirectUri, state, code_challenge: codeChallenge, scope, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.code === "email_not_verified") setError("Please verify your email address before signing in.");
        else if (res.status === 401) setError("Invalid email or password.");
        else setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }
      window.location.href = data.redirect_uri;
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <Input label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" loading={loading} className="w-full">Sign in</Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or</span></div>
      </div>

      <a href={`${API_URL}/oauth/google?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&scope=${encodeURIComponent(scope)}`} className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
        <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
      </a>

      <div className="flex items-center justify-between text-sm">
        <a href={`/forgot-password?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&scope=${encodeURIComponent(scope)}`} className="text-gray-500 hover:text-gray-700">Forgot password?</a>
        <a href={`/signup?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&scope=${encodeURIComponent(scope)}`} className="font-medium text-indigo-600 hover:text-indigo-500">Sign up</a>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Refactor the remaining 5 OAuth auth pages**

Apply the same pattern to each:

**`(auth)/signup/page.tsx`**: Wrap happy path in `<AuthScene subtitle="Create your account">`, keep error state as-is.

**`(auth)/signup/signup-form.tsx`**: Replace raw `<input>` with `<Input label="..." .../>`, raw `<button>` with `<Button loading={loading} className="w-full">`, keep Google OAuth link unchanged.

**`(auth)/forgot-password/page.tsx`**: Wrap in `<AuthScene subtitle="Reset your password">`.

**`(auth)/forgot-password/forgot-password-form.tsx`**: Replace raw input/button with `<Input>`/`<Button>`.

**`(auth)/reset-password/page.tsx`**: Wrap in `<AuthScene subtitle="Set a new password">`.

**`(auth)/reset-password/reset-password-form.tsx`**: Replace raw inputs/button with `<Input>`/`<Button>`.

For each form file, the pattern is identical to Step 2: import `Input` and `Button` from `@/components/ui/`, replace `<input className="w-full rounded-lg border...">` with `<Input label="..." />`, replace `<button className="w-full rounded-lg bg-indigo-600...">` with `<Button loading={loading} className="w-full">`. Keep form logic, error handling, and success states unchanged.

- [ ] **Step 4: Refactor dashboard login page and form**

Replace `apps/web/src/app/dashboard/login/page.tsx`:

```tsx
import { AuthScene } from "@/components/three/auth-scene";
import { DashboardLoginForm } from "./login-form";

export default function DashboardLoginPage() {
  return (
    <AuthScene subtitle="Sign in to the developer dashboard">
      <DashboardLoginForm />
    </AuthScene>
  );
}
```

Replace `apps/web/src/app/dashboard/login/login-form.tsx` — swap raw inputs/buttons for shared components:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginFormInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const err = await login(email, password);
      if (err) setError(err);
      else router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <Input label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" loading={loading} className="w-full">Sign in</Button>
      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <a href="/dashboard/signup" className="font-medium text-indigo-600 hover:text-indigo-500">Sign up</a>
      </p>
    </form>
  );
}

export function DashboardLoginForm() {
  return (
    <AuthProvider>
      <LoginFormInner />
    </AuthProvider>
  );
}
```

- [ ] **Step 5: Refactor dashboard signup page and form**

Replace `apps/web/src/app/dashboard/signup/page.tsx`:

```tsx
import { AuthScene } from "@/components/three/auth-scene";
import { DashboardSignupForm } from "./signup-form";

export default function DashboardSignupPage() {
  return (
    <AuthScene subtitle="Create your developer account">
      <DashboardSignupForm />
    </AuthScene>
  );
}
```

Replace `apps/web/src/app/dashboard/signup/signup-form.tsx` — same pattern: replace raw inputs/buttons with `<Input>`/`<Button>`, keep form logic unchanged.

- [ ] **Step 6: Typecheck + visual verification**

```bash
pnpm --filter @authforge/web typecheck
pnpm dev:web
```

Verify: all auth pages show the split layout with 3D shield on the right (desktop) and stacked layout with logo only (mobile). All forms use consistent Input/Button styling.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(auth\)/ apps/web/src/app/dashboard/login/ apps/web/src/app/dashboard/signup/
git commit -m "feat(web): refactor auth pages with AuthScene 3D layout and shared components"
```

---

### Task 9: Applications List + Create Form Refactor

**Files:**
- Modify: `apps/web/src/app/dashboard/(main)/page.tsx`
- Modify: `apps/web/src/app/dashboard/(main)/create-application-form.tsx`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Button`, `EmptyState`, `Skeleton` from `@/components/ui/*`, `Dialog` from `@/components/ui/dialog`, `useToast` from `@/contexts/toast-context`
- Produces: refactored applications list page with tilt cards, badge for environment, 3D empty state, skeleton loading, and dialog-based create form

- [ ] **Step 1: Rewrite applications list page**

Replace `apps/web/src/app/dashboard/(main)/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Rewrite create application form**

Replace `apps/web/src/app/dashboard/(main)/create-application-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";

interface CreateApplicationFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateApplicationForm({ onCreated, onCancel }: CreateApplicationFormProps) {
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("development");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { ok, data } = await apiFetch("/applications", {
        method: "POST",
        body: JSON.stringify({ name, environment }),
      });

      if (!ok) {
        toast("error", (data as { message?: string }).message ?? "Failed to create application.");
        return;
      }

      toast("success", "Application created.");
      onCreated();
    } catch {
      toast("error", "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onCancel}
      title="Create Application"
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button loading={loading} onClick={() => document.getElementById("create-app-form")?.requestSubmit()}>Create</Button>
        </>
      }
    >
      <form id="create-app-form" onSubmit={handleSubmit} className="mt-2 space-y-4">
        <Input label="Name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="My App" />
        <Select
          label="Environment"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          options={[
            { value: "development", label: "Development" },
            { value: "staging", label: "Staging" },
            { value: "production", label: "Production" },
          ]}
        />
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 3: Typecheck + visual verification**

```bash
pnpm --filter @authforge/web typecheck
pnpm dev:web
```

Verify: applications page shows skeleton loading, 3D empty state when no apps, card tilt on hover, badge for environment, Dialog-based create form with toast feedback.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/\(main\)/page.tsx apps/web/src/app/dashboard/\(main\)/create-application-form.tsx
git commit -m "feat(web): refactor applications list with Card, Badge, EmptyState, and Dialog"
```

---

### Task 10: Application Detail + Settings Tab + API Keys Tab

**Files:**
- Modify: `apps/web/src/app/dashboard/(main)/applications/[id]/page.tsx`
- Modify: `apps/web/src/app/dashboard/(main)/applications/[id]/settings-tab.tsx`
- Modify: `apps/web/src/app/dashboard/(main)/applications/[id]/api-keys-tab.tsx`

**Interfaces:**
- Consumes: `Input`, `Button`, `Badge`, `Spinner`, `Skeleton` from `@/components/ui/*`, `useToast` from `@/contexts/toast-context`, `ConfirmDialog` from `@/components/confirm-dialog`
- Produces: refactored detail page with skeleton loading, indigo tabs, and shared component usage in settings/API keys tabs

- [ ] **Step 1: Rewrite application detail page**

Replace `apps/web/src/app/dashboard/(main)/applications/[id]/page.tsx` — add skeleton loading and use indigo tab colors (already swapped from Task 1). The main structural change is replacing the spinner with a skeleton:

```tsx
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

  useEffect(() => { fetchApp(); }, [fetchApp]);

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
```

- [ ] **Step 2: Rewrite settings tab**

Replace `apps/web/src/app/dashboard/(main)/applications/[id]/settings-tab.tsx` — use `Input`, `Button`, `useToast`, and updated `ConfirmDialog`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Application {
  id: string;
  name: string;
  redirectUris: string[];
  accessTokenTtl: string;
  refreshTokenTtl: string;
  requireVerifiedEmail: boolean;
}

interface SettingsTabProps {
  app: Application;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function SettingsTab({ app, onUpdated, onDeleted }: SettingsTabProps) {
  const [name, setName] = useState(app.name);
  const [redirectUris, setRedirectUris] = useState<string[]>(app.redirectUris);
  const [newUri, setNewUri] = useState("");
  const [accessTokenTtl, setAccessTokenTtl] = useState(app.accessTokenTtl);
  const [refreshTokenTtl, setRefreshTokenTtl] = useState(app.refreshTokenTtl);
  const [requireVerifiedEmail, setRequireVerifiedEmail] = useState(app.requireVerifiedEmail);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { ok, data } = await apiFetch(`/applications/${app.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, redirectUris, accessTokenTtl, refreshTokenTtl, requireVerifiedEmail }),
      });
      if (!ok) toast("error", (data as { message?: string }).message ?? "Failed to save.");
      else { toast("success", "Settings saved."); onUpdated(); }
    } catch {
      toast("error", "Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  }

  function addUri() {
    const uri = newUri.trim();
    if (uri && !redirectUris.includes(uri)) { setRedirectUris([...redirectUris, uri]); setNewUri(""); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { ok } = await apiFetch(`/applications/${app.id}`, { method: "DELETE" });
      if (ok) onDeleted();
    } finally { setDeleting(false); }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSave} className="space-y-6">
        <Input label="Name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-900">Redirect URIs</label>
          {redirectUris.length > 0 && (
            <ul className="mb-2 space-y-1">
              {redirectUris.map((uri) => (
                <li key={uri} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
                  <span className="flex-1 font-mono text-xs">{uri}</span>
                  <button type="button" onClick={() => setRedirectUris(redirectUris.filter((u) => u !== uri))} className="text-gray-400 hover:text-red-500">&times;</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input type="url" value={newUri} onChange={(e) => setNewUri(e.target.value)} placeholder="https://example.com/callback" className="flex-1" />
            <Button type="button" variant="secondary" onClick={addUri}>Add</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Access Token TTL" value={accessTokenTtl} onChange={(e) => setAccessTokenTtl(e.target.value)} placeholder="15m" hint="e.g. 15m, 1h, 24h" />
          <Input label="Refresh Token TTL" value={refreshTokenTtl} onChange={(e) => setRefreshTokenTtl(e.target.value)} placeholder="30d" hint="e.g. 7d, 30d, 90d" />
        </div>

        <div className="flex items-center gap-3">
          <input id="require-verified" type="checkbox" checked={requireVerifiedEmail} onChange={(e) => setRequireVerifiedEmail(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <label htmlFor="require-verified" className="text-sm font-medium">Require verified email before login</label>
        </div>

        <Button type="submit" loading={saving}>Save Changes</Button>
      </form>

      <div className="mt-12 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
        <p className="mt-1 text-sm text-gray-500">Permanently delete this application and all its data.</p>
        <Button variant="danger" className="mt-3" onClick={() => setShowDelete(true)}>Delete Application</Button>
      </div>

      {showDelete && (
        <ConfirmDialog title="Delete Application" message={`Are you sure you want to delete "${app.name}"? This action cannot be undone.`} confirmLabel={deleting ? "Deleting…" : "Delete"} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite API keys tab**

Replace `apps/web/src/app/dashboard/(main)/applications/[id]/api-keys-tab.tsx` — use `Input`, `Button`, `Badge`, `Skeleton`, `useToast`, and updated `ConfirmDialog`:

```tsx
"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface ApiKey { id: string; keyId: string; label: string; lastUsedAt: string | null; revokedAt: string | null; createdAt: string; }

export function ApiKeysTab({ appId }: { appId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const { toast } = useToast();

  const fetchKeys = useCallback(async () => {
    const { ok, data } = await apiFetch<{ apiKeys: ApiKey[] }>(`/applications/${appId}/keys`);
    if (ok) setKeys(data.apiKeys);
    setLoading(false);
  }, [appId]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setCreating(true);
    try {
      const { ok, data } = await apiFetch<{ apiKey: ApiKey; token: string; message?: string }>(`/applications/${appId}/keys`, { method: "POST", body: JSON.stringify({ label: label.trim() }) });
      if (!ok) { toast("error", (data as { message?: string }).message ?? "Failed to create key."); return; }
      setNewToken(data.token);
      setLabel("");
      fetchKeys();
    } catch { toast("error", "Unable to reach the server."); } finally { setCreating(false); }
  }

  async function handleRevoke(keyId: string) {
    await apiFetch(`/applications/${appId}/keys/${keyId}`, { method: "DELETE" });
    setRevokeTarget(null);
    fetchKeys();
    toast("success", "API key revoked.");
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <Skeleton variant="rectangular" height={44} className="mb-6" />
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} variant="rectangular" height={52} className="mb-2" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {newToken && (
        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-800">Store this API key now. It cannot be retrieved again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-yellow-100 px-3 py-2 font-mono text-xs text-yellow-900">{newToken}</code>
            <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(newToken)}>Copy</Button>
          </div>
          <button onClick={() => setNewToken(null)} className="mt-2 text-xs text-yellow-700 hover:text-yellow-900">Dismiss</button>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex gap-3">
        <Input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key label (e.g. Production)" required className="flex-1" />
        <Button type="submit" loading={creating}>Issue Key</Button>
      </form>

      {keys.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No API keys yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Label</th>
                <th className="px-4 py-3 font-medium text-gray-600">Key ID</th>
                <th className="px-4 py-3 font-medium text-gray-600">Last Used</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{key.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{key.keyId}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={key.revokedAt ? "danger" : "success"}>{key.revokedAt ? "Revoked" : "Active"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!key.revokedAt && <Button variant="ghost" size="sm" onClick={() => setRevokeTarget(key)} className="text-red-600 hover:text-red-800">Revoke</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revokeTarget && (
        <ConfirmDialog title="Revoke API Key" message={`Revoke "${revokeTarget.label}"? Applications using this key will lose access.`} confirmLabel="Revoke" onConfirm={() => handleRevoke(revokeTarget.id)} onCancel={() => setRevokeTarget(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + visual verification**

```bash
pnpm --filter @authforge/web typecheck
pnpm dev:web
```

Verify: application detail page loads with skeleton, tabs use indigo active state with horizontal scroll on mobile, settings tab uses Input/Button/Toast, API keys tab uses Badge/Skeleton/Toast.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/\(main\)/applications/\[id\]/page.tsx apps/web/src/app/dashboard/\(main\)/applications/\[id\]/settings-tab.tsx apps/web/src/app/dashboard/\(main\)/applications/\[id\]/api-keys-tab.tsx
git commit -m "feat(web): refactor app detail, settings, and API keys with shared components"
```

---

### Task 11: Roles + Permissions + Audit Tabs + Account Settings

**Files:**
- Modify: `apps/web/src/app/dashboard/(main)/applications/[id]/roles-tab.tsx`
- Modify: `apps/web/src/app/dashboard/(main)/applications/[id]/permissions-tab.tsx`
- Modify: `apps/web/src/app/dashboard/(main)/applications/[id]/audit-tab.tsx`
- Modify: `apps/web/src/app/dashboard/(main)/settings/page.tsx`

**Interfaces:**
- Consumes: `Input`, `Button`, `Badge`, `Skeleton`, `Card` from `@/components/ui/*`, `useToast` from `@/contexts/toast-context`, `ConfirmDialog` from `@/components/confirm-dialog`, `motion`/`AnimatePresence` from `framer-motion`
- Produces: fully refactored remaining tabs with shared components, Framer Motion list animations, skeleton loading, toast feedback, and Card-wrapped account settings

- [ ] **Step 1: Rewrite roles tab**

Replace `apps/web/src/app/dashboard/(main)/applications/[id]/roles-tab.tsx` — use shared components, `useToast`, and Framer Motion list animations:

```tsx
"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
                <motion.div key={role.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-lg border border-gray-200 bg-white">
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
```

- [ ] **Step 2: Rewrite permissions tab**

Replace `apps/web/src/app/dashboard/(main)/applications/[id]/permissions-tab.tsx` — same pattern as roles tab: shared components, toast, list animations:

```tsx
"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Permission { id: string; key: string; description: string | null; createdAt: string; }

export function PermissionsTab({ appId }: { appId: string }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
  const { toast } = useToast();

  const fetchPermissions = useCallback(async () => {
    const { ok, data } = await apiFetch<{ permissions: Permission[] }>(`/applications/${appId}/permissions`);
    if (ok) setPermissions(data.permissions);
    setLoading(false);
  }, [appId]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setCreating(true);
    try {
      const { ok, data } = await apiFetch(`/applications/${appId}/permissions`, { method: "POST", body: JSON.stringify({ key: key.trim(), description: description.trim() || undefined }) });
      if (!ok) { toast("error", (data as { message?: string }).message ?? "Failed to create permission."); return; }
      setKey(""); setDescription(""); fetchPermissions();
    } catch { toast("error", "Unable to reach the server."); } finally { setCreating(false); }
  }

  async function handleDelete(permissionId: string) {
    await apiFetch(`/applications/${appId}/permissions/${permissionId}`, { method: "DELETE" });
    setDeleteTarget(null); fetchPermissions(); toast("success", "Permission deleted.");
  }

  if (loading) {
    return <div className="max-w-3xl">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} variant="rectangular" height={52} className="mb-2" />)}</div>;
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleCreate} className="mb-6 flex gap-3">
        <Input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Permission key (e.g. posts.create)" required className="flex-1" />
        <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="flex-1" />
        <Button type="submit" loading={creating}>Add Permission</Button>
      </form>

      {permissions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No permissions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Key</th>
                <th className="px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <AnimatePresence>
                {permissions.map((perm) => (
                  <motion.tr key={perm.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{perm.key}</td>
                    <td className="px-4 py-3 text-gray-500">{perm.description ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(perm)} className="text-red-600 hover:text-red-800">Delete</Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && <ConfirmDialog title="Delete Permission" message={`Delete permission "${deleteTarget.key}"? It will be removed from all roles.`} confirmLabel="Delete" onConfirm={() => handleDelete(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite audit tab**

Replace `apps/web/src/app/dashboard/(main)/applications/[id]/audit-tab.tsx` — add skeleton loading, horizontal scroll wrapper, use `Input` for filter, use `Button` for load more:

```tsx
"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry { id: string; endUserId: string | null; action: string; ipAddress: string | null; userAgent: string | null; metadata: Record<string, unknown> | null; createdAt: string; }

export function AuditTab({ appId }: { appId: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (before?: string, append = false) => {
    const params = new URLSearchParams({ limit: "25" });
    if (before) params.set("before", before);
    if (userFilter.trim()) params.set("user_id", userFilter.trim());
    const { ok, data } = await apiFetch<{ logs: AuditEntry[] }>(`/applications/${appId}/audit/logs?${params}`);
    if (ok) {
      const entries = data.logs;
      setLogs((prev) => (append ? [...prev, ...entries] : entries));
      setHasMore(entries.length === 25);
    }
    setLoading(false);
  }, [appId, userFilter]);

  useEffect(() => { setLoading(true); fetchLogs(); }, [fetchLogs]);

  if (loading) {
    return <div className="max-w-4xl">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} variant="rectangular" height={44} className="mb-2" />)}</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Input type="text" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Filter by user ID…" className="w-64" />
      </div>

      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No audit events found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Timestamp</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="px-4 py-3 font-medium text-gray-600">User ID</th>
                  <th className="px-4 py-3 font-medium text-gray-600">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="cursor-pointer hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{log.action}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.endUserId ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{log.ipAddress ?? "—"}</td>
                    </tr>
                    {expandedId === log.id && log.metadata && (
                      <tr><td colSpan={4} className="bg-gray-50 px-4 py-3"><pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-gray-600">{JSON.stringify(log.metadata, null, 2)}</pre></td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && <Button variant="secondary" className="mt-4 w-full" onClick={() => { const last = logs[logs.length - 1]; if (last) fetchLogs(last.createdAt, true); }}>Load more</Button>}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite account settings page**

Replace `apps/web/src/app/dashboard/(main)/settings/page.tsx` — wrap in `Card`:

```tsx
"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  const { developer } = useAuth();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Account Settings</h1>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-gray-600">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">Name</label>
            <p className="text-sm text-gray-900">{developer?.name}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">Email</label>
            <p className="text-sm text-gray-900">{developer?.email}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + visual verification**

```bash
pnpm --filter @authforge/web typecheck
pnpm dev:web
```

Verify: roles/permissions tabs show list animations on add/remove, toast notifications on success/error, skeleton loading. Audit tab has horizontal scroll on mobile, skeleton loading. Settings page uses Card wrapper.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/dashboard/\(main\)/applications/\[id\]/roles-tab.tsx apps/web/src/app/dashboard/\(main\)/applications/\[id\]/permissions-tab.tsx apps/web/src/app/dashboard/\(main\)/applications/\[id\]/audit-tab.tsx apps/web/src/app/dashboard/\(main\)/settings/page.tsx
git commit -m "feat(web): refactor remaining tabs and settings with shared components and animations"
```
