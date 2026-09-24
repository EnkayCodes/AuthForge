# Dashboard Design System & Visual Polish

## Goal

Transform the AuthForge developer dashboard from a functional prototype into a portfolio-grade product. Build an internal design system (`components/ui/`), establish brand identity (indigo palette, SVG logo), add 3D animations with React Three Fiber, and refactor every dashboard page to use shared components — eliminating all copy-pasted styling.

## Architecture

The design system lives in `apps/web/src/components/ui/` as a flat set of reusable React components with Tailwind CSS styling. 3D scenes live in `apps/web/src/components/three/`. All pages import from these two directories instead of duplicating classes. Framer Motion handles 2D animations (page transitions, toast entrances, list reordering). React Three Fiber handles 3D scenes (auth pages, empty states). CSS handles lightweight effects (card tilt on hover, sidebar logo pulse, skeleton shimmer).

## Tech Stack

- React 19 + Next.js 15 (existing)
- Tailwind CSS v4 (existing)
- Framer Motion (new dependency) — page transitions, toast animations, list animations
- Three.js + @react-three/fiber + @react-three/drei (new dependencies) — 3D shield scenes
- No other new runtime dependencies

---

## 1. Brand Identity

### Primary Color

Replace all `blue-600` usage with `indigo-600` (#4F46E5) throughout the dashboard and auth pages.

| Token | Current | New |
|-------|---------|-----|
| Primary | `blue-600` (#2563EB) | `indigo-600` (#4F46E5) |
| Primary hover | `blue-700` | `indigo-700` |
| Primary light (bg) | `blue-50` | `indigo-50` |
| Primary text | `text-blue-600` | `text-indigo-600` |
| Focus ring | `ring-blue-500` | `ring-indigo-500` |
| Focus border | `border-blue-500` | `border-indigo-500` |

The hosted OAuth pages (`(auth)/login`, `(auth)/signup`, `(auth)/forgot-password`, `(auth)/reset-password`) also use `blue-600` — these switch to `indigo-600` too.

### Logo

An SVG logo combining a shield icon mark with an integrated key motif and "AuthForge" wordmark.

- **Full logo** (icon + wordmark): used in sidebar header, auth page headers
- **Icon mark** (shield only): used as favicon (32x32 and 16x16), and in the 3D scene as the geometry reference
- **File locations:**
  - `apps/web/public/logo.svg` — full logo SVG
  - `apps/web/public/icon.svg` — icon mark SVG
  - `apps/web/src/app/favicon.ico` — generated from icon mark

### Favicon

The favicon uses the shield icon mark. It replaces the default Next.js favicon. Place `favicon.ico` in `apps/web/src/app/` (Next.js App Router convention).

---

## 2. Design System Components

All components live in `apps/web/src/components/ui/`. Each is a single file exporting one named component. Props use TypeScript interfaces. All components use `indigo-600` as the primary color.

### 2.1 Button

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}
```

- **primary**: `bg-indigo-600 text-white hover:bg-indigo-700` with focus ring
- **secondary**: `border border-gray-300 text-gray-700 hover:bg-gray-50`
- **danger**: `bg-red-600 text-white hover:bg-red-700`
- **ghost**: `text-gray-500 hover:text-gray-700 hover:bg-gray-100`
- Loading state shows a small spinner inline, button disabled
- Disabled state: `opacity-50 cursor-not-allowed`
- All variants include focus-visible ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`

### 2.2 Input

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}
```

- Renders a `<label>` + `<input>` + optional error/hint text
- Base: `w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm`
- Focus: `focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500`
- Error state: `border-red-300 focus:border-red-500 focus:ring-red-500` + red error text below
- Wraps `React.forwardRef` for form library compatibility

### 2.3 Select

```tsx
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}
```

- Same visual treatment as Input (rounded-lg, border, focus ring)
- Renders `<label>` + `<select>` + error text
- Custom chevron icon via background-image or trailing SVG

### 2.4 Badge

```tsx
interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}
```

- `rounded-full px-2.5 py-0.5 text-xs font-medium`
- **default**: `bg-gray-100 text-gray-700`
- **success**: `bg-green-100 text-green-700`
- **warning**: `bg-yellow-100 text-yellow-700`
- **danger**: `bg-red-100 text-red-700`
- **info**: `bg-indigo-100 text-indigo-700`

Replaces hardcoded environment color maps and status badges across the app.

### 2.5 Card

```tsx
interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
}
```

- Base: `rounded-xl border border-gray-200 bg-white p-6 shadow-sm`
- `hover` prop adds CSS 3D tilt effect on mousemove (see Section 4)
- Accepts `className` for layout overrides (grid sizing, etc.)

### 2.6 Spinner

```tsx
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}
```

- `animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600`
- **sm**: `h-4 w-4` (inline in buttons)
- **md**: `h-6 w-6` (in tab content loading)
- **lg**: `h-8 w-8` (full-page loading)

### 2.7 Dialog

```tsx
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}
```

Replaces the existing `ConfirmDialog`. Improvements:

- **Focus trap**: tab cycles within the dialog while open
- **Escape key**: closes the dialog
- **Backdrop**: `bg-black/50` with click-to-close
- **Animation**: Framer Motion `AnimatePresence` for fade+scale entrance/exit
- **Scroll lock**: prevents body scroll while open
- **Accessible**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title

A convenience `ConfirmDialog` wrapper keeps the simple confirm/cancel API but delegates to `Dialog` internally.

### 2.8 Toast

```tsx
interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}
```

- **ToastProvider**: wraps the app, manages toast queue in state
- **useToast()**: returns `{ toast(type, message) }` — call from anywhere
- **ToastContainer**: renders in a fixed position (top-right), stacks toasts vertically
- Each toast auto-dismisses after 5 seconds, has a manual close button
- **Animation**: Framer Motion slide-in from right, slide-out on dismiss
- **Variants**:
  - success: green-left-border accent, check icon
  - error: red-left-border accent, X icon
  - info: indigo-left-border accent, info icon

### 2.9 EmptyState

```tsx
interface EmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  illustration?: "shield" | "none";
}
```

- Centered layout with optional 3D illustration
- `illustration="shield"` renders a small `<ShieldScene />` (see Section 3)
- `illustration="none"` (or omitted) renders a simple dashed-border container
- Action button uses `Button` component with `variant="primary"`

### 2.10 Skeleton

```tsx
interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  lines?: number;
}
```

- Renders a pulsing placeholder matching the shape of content that will load
- **text**: rounded rectangle, full width, `h-4` per line with `gap-2` between lines
- **circular**: `rounded-full`, square aspect ratio
- **rectangular**: `rounded-lg`, explicit width/height
- CSS `@keyframes shimmer` animation: gradient sweep left-to-right
- Used in page loading states instead of bare spinners (spinner reserved for action-in-progress like button submits)

---

## 3. 3D Animations (React Three Fiber)

### 3.1 Setup

Dependencies: `three`, `@react-three/fiber`, `@react-three/drei`

All R3F code lives in `apps/web/src/components/three/`:
- `shield-scene.tsx` — the reusable 3D shield component
- `auth-scene.tsx` — the full-width scene used on auth pages

R3F Canvas components are dynamically imported (`next/dynamic` with `ssr: false`) since Three.js requires the browser's WebGL context.

### 3.2 ShieldScene

A 3D shield with a key silhouette cut into it:

- **Geometry**: extruded shield shape (custom `Shape` from Three.js path commands)
- **Material**: `MeshStandardMaterial` with indigo color (#4F46E5), metallic: 0.3, roughness: 0.6
- **Animation**: slow continuous rotation on Y-axis (~0.3 rad/s) + gentle float up/down (sine wave, 0.1 amplitude, 0.5 Hz)
- **Lighting**: one ambient light (intensity 0.4) + one directional light (intensity 0.8, casting soft shadows)
- **Camera**: perspective, positioned to show the shield at a ~20° angle

Two sizes:
- **Large** (auth pages): fills the right half of a split layout on desktop
- **Small** (empty states): ~200px tall, centered

### 3.3 AuthScene

Used on login, signup, forgot-password, reset-password pages:

- Desktop (≥768px): split layout — form on the left (max-w-md), 3D scene filling the right half with a subtle indigo gradient background
- Mobile (<768px): 3D scene is hidden, form is full-width with the logo above it

### 3.4 Reduced Motion

All 3D animations check `window.matchMedia("(prefers-reduced-motion: reduce)")`:
- If reduced motion preferred: shield renders statically (no rotation, no float), positioned at the default angle
- The Canvas still renders (showing the 3D shield is valuable even without motion)

---

## 4. CSS & Framer Motion Effects

### 4.1 Card Tilt (CSS + JS)

Application cards in the grid use a CSS perspective tilt effect on hover:

- Container has `perspective: 1000px`
- On `mousemove`, calculate mouse position relative to card center
- Apply `transform: rotateX(Xdeg) rotateY(Ydeg)` based on position (max ±5°)
- On `mouseleave`, animate back to `rotateX(0) rotateY(0)` with `transition: transform 0.3s ease`
- Subtle `box-shadow` increase on hover

This lives as a custom hook `useTiltEffect(ref)` in `apps/web/src/hooks/use-tilt.ts`, applied to `Card` when `hover` prop is set.

### 4.2 Sidebar Logo Animation (CSS)

On initial page load, the logo in the sidebar does a subtle 3D flip:
- `@keyframes logoReveal`: `rotateY(-90deg)` → `rotateY(0)` over 0.6s with ease-out
- Triggers once via `animation-fill-mode: forwards` and `animation-iteration-count: 1`
- `prefers-reduced-motion`: skip animation, show logo immediately

### 4.3 Page Transitions (Framer Motion)

Wrap the dashboard layout's `{children}` in a Framer Motion `AnimatePresence` with:
- Enter: `opacity: 0, y: 8` → `opacity: 1, y: 0` over 200ms
- Exit: `opacity: 0` over 100ms

Uses the `key` from the current pathname to trigger animations on route change.

### 4.4 Toast Animations (Framer Motion)

- Enter: slide in from right (`x: 100` → `x: 0`) + fade (`opacity: 0` → `opacity: 1`)
- Exit: slide out to right + fade out
- Stack animations: existing toasts shift down smoothly when a new one enters (Framer Motion `layout` prop)

### 4.5 Dialog Animations (Framer Motion)

- Backdrop: `opacity: 0` → `opacity: 1`
- Panel: `scale: 0.95, opacity: 0` → `scale: 1, opacity: 1` with spring transition
- Exit: reverse

### 4.6 List Animations (Framer Motion)

For lists that change (API keys table, roles/permissions lists):
- Items enter with `opacity: 0, y: -8` → `opacity: 1, y: 0`
- Items exit with `opacity: 0, x: -20`
- Uses Framer Motion `layout` for smooth reordering

---

## 5. Skeleton Loading States

Replace bare spinner loading states with skeleton screens on these pages:

| Page | Skeleton Layout |
|------|----------------|
| Applications list | 3x2 grid of card-shaped skeletons with text lines |
| Application detail | Header skeleton + tab bar + content area skeleton |
| API Keys tab | Form skeleton + table with 3 skeleton rows |
| Roles tab | List of 3 skeleton rows |
| Permissions tab | List of 3 skeleton rows |
| Audit tab | Table with 5 skeleton rows |
| Settings page | 2 card-shaped skeletons with text lines |

The `Spinner` component is still used for inline action feedback (button loading states, form submissions).

---

## 6. Responsive Mobile Layout

### 6.1 Sidebar

- Desktop (≥1024px): fixed `w-64` sidebar, always visible (current behavior)
- Tablet (768px–1023px): sidebar collapses to icons only (`w-16`), hover to expand with tooltip labels
- Mobile (<768px): sidebar hidden, hamburger menu button in topbar, sidebar slides in as overlay with backdrop

State managed via a `useSidebar()` hook in `apps/web/src/hooks/use-sidebar.ts` with `useState` + media query listener.

### 6.2 Content Area

- Application card grid: `grid-cols-1` on mobile, `grid-cols-2` on tablet, `grid-cols-3` on desktop
- Forms: full-width on mobile (already are)
- Tables: horizontal scroll wrapper on mobile
- Tab navigation: horizontal scroll on mobile if tabs overflow

### 6.3 Auth Pages

- Desktop: split layout (form left, 3D scene right)
- Mobile: stacked layout (logo + form, no 3D scene)

### 6.4 Topbar

- Always visible at `h-16`
- Mobile: adds hamburger menu button on the left
- Developer name/email truncated with ellipsis on narrow screens

---

## 7. Page-by-Page Refactor

### 7.1 Auth Pages (OAuth hosted)

Files: `(auth)/login`, `(auth)/signup`, `(auth)/forgot-password`, `(auth)/reset-password`

- Wrap in `AuthScene` layout (split form + 3D on desktop, stacked on mobile)
- Add logo above each form
- Replace all `blue-*` with `indigo-*`
- Replace raw `<input>` with `<Input>` component
- Replace raw `<button>` with `<Button>` component
- Replace raw error `<div>` with consistent error styling from Input's `error` prop or inline alert

### 7.2 Dashboard Auth Pages

Files: `dashboard/login`, `dashboard/signup`

- Same treatment as OAuth auth pages (AuthScene layout, logo, indigo palette, shared components)
- Add "Forgot password?" link on login page

### 7.3 Dashboard Layout

File: `dashboard/(main)/layout.tsx`

- Add `ToastProvider` wrapping children
- Add Framer Motion `AnimatePresence` for page transitions
- Responsive sidebar logic (collapsible on tablet, overlay on mobile)

### 7.4 Sidebar

File: `dashboard/(main)/sidebar.tsx`

- Replace "AuthForge" text with SVG logo + wordmark
- Add CSS logo reveal animation
- Replace `blue-50`/`blue-600` active states with `indigo-50`/`indigo-600`
- Add responsive collapse behavior (icons-only on tablet, hidden on mobile)

### 7.5 Auth Guard

File: `components/auth-guard.tsx`

- Replace inline spinner with `<Spinner size="lg" />`
- Update `border-t-blue-600` to use Spinner component (which uses indigo)

### 7.6 Applications List

File: `dashboard/(main)/page.tsx`

- Replace card grid with `<Card hover>` components (adds tilt effect)
- Replace environment color map with `<Badge>` component
- Replace dashed empty state with `<EmptyState illustration="shield">`
- Replace raw buttons with `<Button>` component
- Replace spinner with skeleton loading
- Replace `CreateApplicationForm` modal with `<Dialog>` wrapper

### 7.7 Application Detail

File: `dashboard/(main)/applications/[id]/page.tsx`

- Replace inline tab styling with consistent tab component pattern
- Replace spinner with skeleton loading
- Replace `blue-600` tab active state with `indigo-600`

### 7.8 Settings Tab

File: `settings-tab.tsx`

- Replace all raw `<input>` with `<Input>` component
- Replace raw buttons with `<Button>` component
- Replace inline error/success `<div>`s with `useToast()` calls
- Replace `ConfirmDialog` usage with new `Dialog`-based `ConfirmDialog`

### 7.9 API Keys Tab

File: `api-keys-tab.tsx`

- Replace raw `<input>` with `<Input>` component
- Replace raw buttons with `<Button>` component
- Replace inline error with `useToast()`
- Replace spinner with skeleton loading
- Replace status badges with `<Badge>` component
- Replace `ConfirmDialog` with new version

### 7.10 Roles Tab & Permissions Tab

Files: `roles-tab.tsx`, `permissions-tab.tsx`

- Replace raw inputs/buttons with shared components
- Add Framer Motion list animations for add/remove
- Replace inline error handling with `useToast()`

### 7.11 Audit Tab

File: `audit-tab.tsx`

- Replace spinner with skeleton loading (table rows)
- Table horizontal scroll wrapper for mobile

### 7.12 Account Settings

File: `dashboard/(main)/settings/page.tsx`

- Wrap content in `<Card>` components
- Use consistent typography

### 7.13 Confirm Dialog (migration)

File: `components/confirm-dialog.tsx`

- Rewrite as a thin wrapper around `<Dialog>`, keeping the same external API (`title`, `message`, `confirmLabel`, `onConfirm`, `onCancel`)
- All existing usages continue working without changes
- Gains: focus trap, Escape key, animation, accessibility

---

## 8. New Dependencies

| Package | Purpose | Approx Size |
|---------|---------|-------------|
| `framer-motion` | 2D animations (page transitions, toasts, dialogs, lists) | ~32KB gzipped |
| `three` | 3D rendering engine | ~150KB gzipped |
| `@react-three/fiber` | React renderer for Three.js | ~40KB gzipped |
| `@react-three/drei` | Helper components (lighting, materials, controls) | Tree-shakeable |

All are production dependencies in `apps/web/package.json`.

---

## 9. File Structure (New Files)

```
apps/web/
├── public/
│   ├── logo.svg                          # Full logo (shield + wordmark)
│   └── icon.svg                          # Icon mark (shield only)
├── src/
│   ├── app/
│   │   └── favicon.ico                   # Generated from icon.svg
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── empty-state.tsx
│   │   │   └── skeleton.tsx
│   │   ├── three/
│   │   │   ├── shield-scene.tsx          # Reusable 3D shield
│   │   │   └── auth-scene.tsx            # Auth page split layout with 3D
│   │   ├── auth-guard.tsx                # Modified (uses Spinner)
│   │   └── confirm-dialog.tsx            # Rewritten (wraps Dialog)
│   ├── contexts/
│   │   ├── auth-context.tsx              # Existing, unchanged
│   │   └── toast-context.tsx             # New: ToastProvider + useToast
│   └── hooks/
│       ├── use-tilt.ts                   # Card tilt effect hook
│       └── use-sidebar.ts               # Responsive sidebar state
```

---

## 10. Out of Scope

- **Dark mode**: adds design surface area without demonstrating new skills for the portfolio
- **i18n / localization**: not relevant to IAM platform showcase
- **Real-time updates**: WebSocket-based audit log streaming, live session counts — deferred to a future phase
- **Component documentation**: no Storybook or similar — components are documented by their TypeScript interfaces and usage in the app
- **Landing page redesign**: the root `/` page is not part of this work — focus is on dashboard and auth pages only
