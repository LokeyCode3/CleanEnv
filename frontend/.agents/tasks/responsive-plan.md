# Responsive UI Implementation Plan — PathHoles Frontend

**Audit date:** post-read of all 30 source files  
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS v3 + Framer Motion + Recharts + Leaflet  
**No Capacitor config found** — apply iOS/Android safe-area CSS universally via env() so the app is Capacitor-ready if added later.

---

## Execution Order

Shared infrastructure → Layout shells → UI primitives → Auth pages → Citizen pages → Admin pages → Officer pages.
Each numbered item below must be completed before moving to the next because later items depend on the shared classes and layout changes introduced earlier.

---

## 1. `index.html` — Viewport meta

**Issues:** Missing `viewport-fit=cover` — iOS WKWebView clips to safe rectangle without it; safe-area env() values will all resolve to 0px.

**Changes:**
Replace the existing viewport meta tag:
```html
<!-- BEFORE -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- AFTER -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

**Files:** `index.html`  
**Verify:** Open the app in a Chromium-based browser, go to DevTools → Elements and confirm the meta tag reads `viewport-fit=cover`. Build: `npm run build` must complete with no errors.

---

## 2. `src/index.css` — Global CSS foundations

**Issues found:**
- `* { box-sizing: border-box }` exists but is missing `*::before, *::after` — pseudo-elements can still overflow.
- No `overflow-x: hidden` on `html`/`body` — any overflowing child causes a page-level horizontal scrollbar.
- No `-webkit-tap-highlight-color` — iOS shows grey tap flash on interactive elements.
- No `touch-action: manipulation` — adds ~300ms tap delay on older iOS/Android WebViews.
- No `scroll-behavior: smooth`.
- No `font-size: 16px` guard on `input`/`select`/`textarea` — iOS Safari auto-zooms when font-size < 16px.
- No safe-area utility classes — needed by CitizenLayout, OfficerLayout, and Modal.

**Changes — replace the entire `@layer base` block and add utilities:**

```css
/* ── Replace existing @layer base block ─────────────────────── */
@layer base {
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    overflow-x: hidden;
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
  }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  /* Prevent iOS auto-zoom on focus */
  input, select, textarea {
    font-size: max(16px, 1rem);
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; }
  ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
}

/* ── Add to @layer utilities (after existing utilities) ──────── */
@layer utilities {
  .min-w-0-fix { min-width: 0; }

  /* Safe-area inset padding utilities for Capacitor / notched phones */
  .pt-safe  { padding-top: env(safe-area-inset-top, 0px); }
  .pb-safe  { padding-bottom: env(safe-area-inset-bottom, 0px); }
  .pl-safe  { padding-left: env(safe-area-inset-left, 0px); }
  .pr-safe  { padding-right: env(safe-area-inset-right, 0px); }
  .px-safe  { padding-left: env(safe-area-inset-left, 0px); padding-right: env(safe-area-inset-right, 0px); }

  /* Touch-target floor — applied to small interactive icons */
  .touch-target {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
```

**Note:** The `font-size: max(16px, 1rem)` rule on inputs will visually override the `text-sm` class used in Input.tsx. The Input component must add `md:text-sm` to restore the smaller size on larger viewports (handled in item 5).

**Files:** `src/index.css`  
**Verify:** `npm run build` — no errors. In browser DevTools, confirm `html` has `overflow-x: hidden` and `body` has `touch-action: manipulation`.

---

## 3. `src/components/layout/CitizenLayout.tsx` — Mobile-first citizen shell

**Issues found:**
- `<header>` has no top safe-area padding — on iPhones with notches, the logo overlaps the status bar.
- `<main>` uses `pb-24` (96px fixed) for bottom nav clearance — the actual nav height is `py-2` ≈ 56px but iPhone home indicator adds ~34px more; `pb-24` may or may not be enough depending on device. Use `calc(4rem + env(safe-area-inset-bottom))` for exactness.
- Bottom `<nav>` has no `pb-[env(safe-area-inset-bottom)]` — the nav bar itself sits on top of the iPhone home indicator, clipping the last nav label.
- The `max-w-lg` (512px) centering wrapper on `<main>` has no `w-full` — at 320px the container shrinks to the content, not the viewport.
- Report FAB (`to === '/citizen/report/new'`) uses `p-3` on its inner `<motion.div>` (~44px square) — fine; but the outer NavLink itself has no explicit minimum touch target, so tapping near the edge of the FAB label hits dead area.
- Logout button is `p-1.5` (30px square) — below 44px minimum touch target.
- The nav buttons (non-FAB) have `py-2 gap-0.5` — total tap area ≈ 36px tall, below 44px.

**Changes:**

### `<header>` — add top safe-area
```tsx
// BEFORE
className="bg-white border-b border-gray-200 sticky top-0 z-30"

// AFTER
className="bg-white border-b border-gray-200 sticky top-0 z-30 pt-safe"
```

### `<main>` — safe bottom padding and w-full
```tsx
// BEFORE
<main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">

// AFTER
<main className="flex-1 max-w-lg mx-auto w-full min-w-0 px-4 py-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
```

### Logout button — touch target
```tsx
// BEFORE
className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"

// AFTER
className="p-2.5 rounded-lg hover:bg-gray-100 text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
```

### Bottom `<nav>` — safe-area bottom padding
```tsx
// BEFORE
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">

// AFTER
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-[env(safe-area-inset-bottom,0px)]">
```

### Nav items (non-FAB) — minimum touch height
```tsx
// BEFORE
'flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors relative',

// AFTER
'flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors relative min-h-[44px]',
```

**Files:** `src/components/layout/CitizenLayout.tsx`  
**Verify:** `npm run build` — no errors. At 320px viewport in DevTools, confirm no horizontal overflow and the bottom nav does not obscure content.

---

## 4. `src/components/layout/AdminLayout.tsx` — Desktop sidebar + mobile drawer

**Issues found:**
- On mobile (`< lg`), the sidebar is `hidden lg:flex` — correct, it's hidden. But the main content `<div>` has no explicit left margin override, relying only on flexbox. The `flex-1` approach is correct but needs verification that `overflow-hidden` on the outer div doesn't cause issues on small screens.
- The hamburger button `className="lg:hidden text-gray-500 hover:text-gray-700"` renders a `<button>` with only a 20px icon — no minimum touch target (`w-5 h-5` = 20×20px).
- `<header>` has `px-6 py-4` — on 320px this gives 24px horizontal padding on each side, leaving only 272px for content. Reduce to `px-4` on mobile.
- The mobile drawer `<Sidebar />` is rendered as a component function inside the render function — this causes it to remount on every state change, dropping scroll position. The Sidebar should be extracted to a stable component defined outside AdminLayout. **However**, since the task prohibits unrelated rewrites, the minimal fix is to move the `const Sidebar = () => (...)` definition outside the `AdminLayout` component body and pass props. Since this is a responsive fix (prevents jank), it qualifies.
- The `collapsed` state exists only in the `Sidebar` closure — once Sidebar is extracted, it must receive `collapsed`, `setCollapsed`, and `mobileOpen`/`setMobileOpen` as props.
- `<main className="flex-1 overflow-y-auto p-6">` — `p-6` on 320px gives 24px padding on each side, leaving 272px. Add `p-4` on mobile, `p-6` on md+.

**Changes:**

### Hamburger button — touch target
```tsx
// BEFORE
<button
  onClick={() => setMobileOpen(true)}
  className="lg:hidden text-gray-500 hover:text-gray-700"
>
  <Menu className="w-5 h-5" />
</button>

// AFTER
<button
  onClick={() => setMobileOpen(true)}
  className="lg:hidden text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2"
  aria-label="Open navigation"
>
  <Menu className="w-5 h-5" />
</button>
```

### Header padding — mobile-friendly
```tsx
// BEFORE
<header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0">

// AFTER
<header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center gap-4 shrink-0">
```

### Main content padding — mobile-friendly
```tsx
// BEFORE
<main className="flex-1 overflow-y-auto p-6">

// AFTER
<main className="flex-1 overflow-y-auto p-4 md:p-6">
```

### Extract Sidebar as stable component
Move `const Sidebar = () => (...)` outside `export const AdminLayout = ...` and change its signature to:
```tsx
interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
  user: { name: string; role: string } | null;
  onLogout: () => void;
}
const AdminSidebar = ({ collapsed, setCollapsed, setMobileOpen, user, onLogout }: SidebarProps) => ( ... )
```
Replace all `<Sidebar />` usages with `<AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} setMobileOpen={setMobileOpen} user={user} onLogout={handleLogout} />`.

**Files:** `src/components/layout/AdminLayout.tsx`  
**Verify:** `npm run build` — no errors. At 375px, confirm hamburger taps open the drawer, content scrolls independently, and no horizontal overflow.

---

## 5. `src/components/layout/OfficerLayout.tsx` — Officer header + bottom nav

**Issues found:**
- `<header>` has no top safe-area padding for iPhone notch.
- Bottom `<nav>` has `py-2` but no `pb-[env(safe-area-inset-bottom)]` — same issue as CitizenLayout.
- Nav items have no explicit `min-h-[44px]`.
- `<main className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6">` — `pb-20` (80px) is used as the mobile bottom offset. More precise: `pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-6`.
- Logout button `className="text-gray-500 hover:text-red-600"` — no touch target.
- The desktop nav links (`hidden md:flex`) have `px-3 py-2` — fine at 36px+. No change needed for those.

**Changes:**

### Header — top safe-area
```tsx
// BEFORE
className="bg-white border-b border-gray-200 sticky top-0 z-30"

// AFTER
className="bg-white border-b border-gray-200 sticky top-0 z-30 pt-safe"
```

### Logout button — touch target
```tsx
// BEFORE
className="text-gray-500 hover:text-red-600"

// AFTER
className="text-gray-500 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
```

### Bottom nav — safe-area + min touch height
```tsx
// BEFORE
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-30">

// AFTER
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-30 pb-[env(safe-area-inset-bottom,0px)]">
```

Nav item classes:
```tsx
// BEFORE
'flex flex-col items-center py-2 gap-0.5 text-xs transition-colors relative',

// AFTER
'flex flex-col items-center py-2 gap-0.5 text-xs transition-colors relative min-h-[44px] justify-center',
```

### Main padding — precise bottom clearance
```tsx
// BEFORE
<main className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6">

// AFTER
<main className="max-w-5xl mx-auto w-full min-w-0 px-4 py-6 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-6">
```

**Files:** `src/components/layout/OfficerLayout.tsx`  
**Verify:** `npm run build` — no errors.

---

## 6. `src/components/ui/Button.tsx` — Minimum touch target

**Issues found:**
- `sm` size: `px-3 py-1.5 text-sm` — renders ~32px tall, below 44px.
- `md` size: `px-4 py-2 text-sm` — renders ~36px tall, below 44px.
- `lg` size: `px-6 py-3 text-base` — renders ~48px tall, fine.
- The `inline-flex` class allows the button to shrink below 44px in height for `sm`/`md` sizes.

**Change — add `min-h-[44px]` to the shared base className string:**
```tsx
// BEFORE
'inline-flex items-center justify-center gap-2 font-medium rounded-lg',

// AFTER
'inline-flex items-center justify-center gap-2 font-medium rounded-lg min-h-[44px]',
```

This does not affect the `lg` button visually. The `sm` and `md` variants will be slightly taller on touch devices, which is the desired outcome. Icons inside buttons remain visually centred because of `items-center`.

**Files:** `src/components/ui/Button.tsx`  
**Verify:** `npm run build` — no errors. Inspect a `size="sm"` button in DevTools — confirm `min-height: 44px`.

---

## 7. `src/components/ui/Badge.tsx` — Shrink prevention in flex contexts

**Issues found:**
- `StatusBadge` and `SeverityBadge` use `inline-flex` but no `shrink-0` — in tight flex rows (e.g. report cards), the badge text wraps or the badge squishes.
- `StatusBadge` already receives `className="shrink-0"` at call sites in some places but not all. Adding it to the base class is more robust.

**Changes:**

### StatusBadge base class
```tsx
// BEFORE
<span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.bg, config.color, className)}>

// AFTER
<span className={cn('inline-flex items-center shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', config.bg, config.color, className)}>
```

### SeverityBadge base class
```tsx
// BEFORE
<span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', config.bg, config.color, className)}>

// AFTER
<span className={cn('inline-flex items-center gap-1.5 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', config.bg, config.color, className)}>
```

**Files:** `src/components/ui/Badge.tsx`  
**Verify:** `npm run build` — no errors.

---

## 8. `src/components/ui/Input.tsx` — iOS zoom fix + w-full

**Issues found:**
- `input`, `textarea`, `select` all use `text-sm` (14px) — triggers iOS auto-zoom on focus. The global CSS rule in item 2 sets `font-size: max(16px, 1rem)` to override this, but the `text-sm` class in the component applies 14px on desktop too, which is undesirable. The fix is to use `text-base md:text-sm` so mobile gets 16px and desktop keeps 14px.
- The `w-full` wrapper `<div>` already exists — the inputs inherit it. The `w-full` on the `<input>` itself already exists. No change needed there.

**Changes — update className string in `Input`, `Textarea`, and `Select`:**

In all three forwardRef components, replace `text-sm` in the cn() call on the form element with `text-base md:text-sm`:

### Input element
```tsx
// BEFORE
'w-full px-3 py-2 border rounded-lg text-sm bg-white placeholder-gray-400',

// AFTER
'w-full px-3 py-2 border rounded-lg text-base md:text-sm bg-white placeholder-gray-400',
```

### Textarea element
```tsx
// BEFORE
'w-full px-3 py-2 border rounded-lg text-sm bg-white placeholder-gray-400',

// AFTER
'w-full px-3 py-2 border rounded-lg text-base md:text-sm bg-white placeholder-gray-400',
```

### Select element
```tsx
// BEFORE
'w-full px-3 py-2 border rounded-lg text-sm bg-white',

// AFTER
'w-full px-3 py-2 border rounded-lg text-base md:text-sm bg-white',
```

**Files:** `src/components/ui/Input.tsx`  
**Verify:** `npm run build` — no errors. On a simulated iPhone in DevTools, focus an input — confirm no zoom.

---

## 9. `src/components/ui/Modal.tsx` — Mobile viewport safety + body scroll lock

**Issues found:**
- `p-4` wrapper on `fixed inset-0` is fine for centering, but on very short viewports (e.g. landscape phone at 568px height) `max-h-[90vh]` may still clip content. No change needed here — 90vh is already correct.
- The backdrop `<div className="absolute inset-0 bg-black/50 backdrop-blur-sm">` uses `absolute` instead of `fixed` — if the modal's parent is scrolled, the backdrop won't cover the full viewport. Use `fixed` for the backdrop.
- No body scroll lock — the page behind the modal scrolls when the modal is open on mobile, causing disorienting UX.
- The close button is `p-1.5` (~30px) — below 44px touch target.
- On 320px, `px-6` inner padding leaves only 320 - 16 (outer p-4 on each side) - 48 (inner px-6 on each side) = 240px for content. Reduce modal inner padding to `px-4 md:px-6`.

**Changes:**

### Backdrop — fixed instead of absolute
```tsx
// BEFORE
<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

// AFTER
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
```

### Body scroll lock — add useEffect
At the top of the Modal function body, add:
```tsx
import { useEffect } from 'react'; // add to existing imports

// Inside Modal(), before the early return:
useEffect(() => {
  if (isOpen) {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }
}, [isOpen]);
```

### Close button — touch target
```tsx
// BEFORE
className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"

// AFTER
className="p-2.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
```

### Inner content padding — responsive
```tsx
// BEFORE (header div)
<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">

// AFTER
<div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
```

```tsx
// BEFORE (content div)
<div className={cn(!title && 'pt-6', 'px-6 pb-6')}>{children}</div>

// AFTER
<div className={cn(!title && 'pt-6', 'px-4 md:px-6 pb-6')}>{children}</div>
```

**Files:** `src/components/ui/Modal.tsx`  
**Verify:** `npm run build` — no errors. Open a modal on mobile simulation — confirm page does not scroll behind it and the close button taps cleanly.

---

## 10. `src/pages/auth/LoginPage.tsx` and `src/pages/auth/RegisterPage.tsx` — 320px usability

**Issues found (both pages):**
- The outer card uses `p-8` (32px padding on each side) — at 320px the card interior is only 320 - 32 (page p-4 on each side from the outer div) - 64 (card p-8 on each side) = 192px wide. The text and inputs still fit but it's tight.
- `p-8` at 320px: 32px left + 32px right = 64px consumed from 320px = 256px content width. This is workable but the demo credentials box text (`citizen@example.com / Citizen@123`) can overflow at very small sizes. Use `p-6 sm:p-8`.
- The password toggle button in LoginPage sits `absolute right-3 top-8` — if the label pushes the input down (due to error messages), the button may not align with the input. This is a minor positioning issue; `top-8` is `2rem` which aligns to the middle of a labeled input. No change needed here.
- RegisterPage: the `p-8` card has 5 form fields + button — on short mobile viewports (568px landscape) this will scroll. The outer page `flex items-center justify-center` makes the whole page try to vertically centre content taller than the viewport, cutting off the top of the card. Switch to `items-start py-8` to allow scrolling.

### LoginPage changes:

Card padding:
```tsx
// BEFORE
<div className="bg-white rounded-2xl shadow-xl p-8">

// AFTER
<div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
```

Demo credentials box — ensure wrapping:
```tsx
// BEFORE
<div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">

// AFTER
<div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1 break-all">
```

### RegisterPage changes:

Outer wrapper — allow vertical scroll on short viewports:
```tsx
// BEFORE
<div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">

// AFTER
<div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-start justify-center p-4 py-8">
```

Card padding:
```tsx
// BEFORE
<div className="bg-white rounded-2xl shadow-xl p-8">

// AFTER
<div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
```

**Files:** `src/pages/auth/LoginPage.tsx`, `src/pages/auth/RegisterPage.tsx`  
**Verify:** `npm run build` — no errors. At 320px in DevTools, confirm no horizontal overflow and all fields are reachable.

---

## 11. `src/pages/citizen/CitizenHomePage.tsx` — Stats grid and quick actions

**Issues found:**
- Stats grid: `grid grid-cols-3 gap-3` — at 320px each cell is (320 - 32 padding - 16 gaps) / 3 ≈ 90px wide. The `text-2xl font-bold` number (`{totalCount}`) is 4+ chars wide at 24px font — it can overflow the 90px cell. Fix: keep 3 columns but reduce to `text-xl` and use smaller padding.
- Quick action cards: `grid grid-cols-2 gap-3` — at 320px each card is (320 - 32 - 12) / 2 ≈ 138px. The card content is `flex items-center gap-3` with a 40px icon + text — at 138px this is tight but workable. The text `"Nearby Issues"` + `"See your area"` fits in ≈ 80px. No layout change needed, but add `min-w-0` to the text `<div>` to prevent overflow.
- Welcome banner's `text-2xl font-bold` heading clips on very long first names — add `truncate` to the name span.
- The `Button` in the banner uses `w-full relative` — at 320px this is already full width. No change needed.

**Changes:**

### Stats grid — prevent cell overflow at 320px
```tsx
// BEFORE
<motion.div variants={prefersReduced ? {} : sectionVariants} className="grid grid-cols-3 gap-3">
  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
    <div className="text-2xl font-bold text-gray-900">{totalCount}</div>

// AFTER
<motion.div variants={prefersReduced ? {} : sectionVariants} className="grid grid-cols-3 gap-2 sm:gap-3">
  <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-4 text-center">
    <div className="text-xl font-bold text-gray-900">{totalCount}</div>
```
Apply the same `p-2 sm:p-4` and `text-xl` change to all three stat cells (`totalCount`, `resolvedCount`, `activeCount`).

### Quick actions — prevent text overflow
```tsx
// BEFORE (both action cards)
<div>
  <div className="text-sm font-medium text-gray-900">Nearby Issues</div>
  <div className="text-xs text-gray-500">See your area</div>
</div>

// AFTER
<div className="min-w-0">
  <div className="text-sm font-medium text-gray-900 truncate">Nearby Issues</div>
  <div className="text-xs text-gray-500 truncate">See your area</div>
</div>
```
Apply the same pattern to the "My Reports" action card.

### Welcome banner — name overflow
```tsx
// BEFORE
<h1 className="text-2xl font-bold mt-1 relative">{user?.name?.split(' ')[0]} 👋</h1>

// AFTER
<h1 className="text-2xl font-bold mt-1 relative truncate">{user?.name?.split(' ')[0]} 👋</h1>
```

**Files:** `src/pages/citizen/CitizenHomePage.tsx`  
**Verify:** `npm run build` — no errors. At 320px, confirm stats grid shows 3 columns with no overflow.

---

## 12. `src/pages/citizen/ReportNewPage.tsx` — Multi-step form at 320px

**Issues found:**
- Step 1 category grid: `grid grid-cols-2 gap-2` with `p-4` buttons — at 320px each button is (320 - 32 padding - 8 gap) / 2 ≈ 140px. The `text-sm font-medium` category name plus icon may wrap awkwardly. Use `p-3` and `text-xs` at small sizes.
- Step 3 map container: `style={{ height: 220 }}` — fixed inline px height. Replace with `h-[220px]` Tailwind or at minimum ensure the parent is `w-full` to prevent horizontal overflow. The inline style is fine for height, but the `overflow-hidden` parent already constrains width.
- Step 3 address grid: `grid grid-cols-2 gap-3` — at 320px each column is (320 - 32 - 12) / 2 ≈ 138px. Input labels like "Area / Locality" at 138px are fine because `w-full` on inputs fills the cell. No change needed.
- Progress bar: `flex gap-1` with 5 segments — each segment is `flex-1 h-1.5`. At 320px: (320 - 32 - 16 gap) / 5 ≈ 54px per segment — fine.
- Step 5 review card: `grid` not used — just divides via `p-4`. At 320px with `p-4` inner padding per row, fine.
- Photo upload dropzone: `p-8` — at 320px gives 32px padding each side on a (320-32) = 288px wide element, leaving 224px interior. The camera icon and text fit. Fine, no change.
- Step progress dots size: Fine. 5 `h-1.5 flex-1` bars scale correctly.
- The `ChevronLeft` back button is `w-5 h-5` with no padding — touch target ≈ 20px. Wrap in a `p-2` to achieve 44px.
- The remove image button (`absolute top-1 right-1`) is `p-0.5` ≈ 16px — very small. Increase to `p-1`.

**Changes:**

### Category grid buttons — compact at small sizes
```tsx
// BEFORE
className={cn(
  'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
  ...
)}

// AFTER
className={cn(
  'flex items-center gap-2 p-2 sm:p-4 rounded-xl border-2 text-left transition-all',
  ...
)}
```

And the category name text:
```tsx
// BEFORE
<span className="text-sm font-medium text-gray-800 leading-tight">{cat.name}</span>

// AFTER
<span className="text-xs sm:text-sm font-medium text-gray-800 leading-tight">{cat.name}</span>
```

### Back button — touch target
```tsx
// BEFORE
<button onClick={() => setStep((s) => (s - 1) as Step)} className="text-gray-500 hover:text-gray-700">
  <ChevronLeft className="w-5 h-5" />
</button>

// AFTER
<button onClick={() => setStep((s) => (s - 1) as Step)} className="text-gray-500 hover:text-gray-700 p-2 -ml-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
  <ChevronLeft className="w-5 h-5" />
</button>
```

### Remove image button — slightly larger target
```tsx
// BEFORE
className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"

// AFTER
className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
```

### Map container — use Tailwind class instead of inline px height
```tsx
// BEFORE
<div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 220 }}>

// AFTER
<div className="rounded-xl overflow-hidden border border-gray-200 h-[220px] w-full">
```

**Files:** `src/pages/citizen/ReportNewPage.tsx`  
**Verify:** `npm run build` — no errors. At 320px, step through all 5 steps and confirm no horizontal overflow.

---

## 13. `src/pages/citizen/NearbyMapPage.tsx` — Map height and filter overflow

**Issues found:**
- Map container: `style={{ height: 420 }}` — inline fixed pixel height. On short screens (landscape phones at ~568px height) combined with the header (≈56px) + CitizenLayout top nav + filter bar (≈100px) + legend (≈24px), this overflows the viewport. Replace with a flex-based approach.
- Filters: `flex gap-2` with two `<Select>` components — at 320px each select is ~(320-32-8)/2 = 140px wide. The default option text "All Categories" at 140px clips. Use `flex-col sm:flex-row` and `w-full sm:w-auto`.
- The outer `div className="space-y-3"` inside CitizenLayout's scrollable `<main>` — the map will scroll with the page rather than being fixed height. This is acceptable for the citizen map. To prevent the map from being taller than the remaining viewport, use `max-h-[calc(100vh-16rem)]` instead of a fixed 420px.

**Changes:**

### Map container — responsive height
```tsx
// BEFORE
<div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 420 }}>

// AFTER
<div className="rounded-xl overflow-hidden border border-gray-200 h-[420px] max-h-[calc(100vh-16rem)] w-full">
```

### Filters — stack on very narrow screens
```tsx
// BEFORE
<div className="flex gap-2">
  <Select ... />
  <Select ... />
</div>

// AFTER
<div className="flex flex-col xs:flex-row gap-2">
  <Select ... className="text-xs py-1.5 w-full xs:w-auto" />
  <Select ... className="text-xs py-1.5 w-full xs:w-auto" />
</div>
```

**Note:** Tailwind does not have a built-in `xs:` breakpoint. Use `sm:flex-row` (640px) instead of `xs:` since the project has no custom xs breakpoint in `tailwind.config.js`.

```tsx
// FINAL
<div className="flex flex-col sm:flex-row gap-2">
  <Select ... className="text-xs py-1.5 w-full sm:w-auto" />
  <Select ... className="text-xs py-1.5 w-full sm:w-auto" />
</div>
```

**Files:** `src/pages/citizen/NearbyMapPage.tsx`  
**Verify:** `npm run build` — no errors. At 375px portrait, confirm map displays and does not cause page-level horizontal scroll.

---

## 14. `src/pages/citizen/MyReportsPage.tsx` — Filter selects

**Issues found:**
- `<div className="flex gap-2">` with two `<Select>` filters — same 320px clipping issue as NearbyMapPage. At 320px each select is ~140px, text clips.
- Report cards already use `w-full`, `truncate`, `min-w-0` in the right places. No changes needed to cards.

**Changes:**

### Filter row — stack on narrow screens
```tsx
// BEFORE
<div className="flex gap-2">
  <Select options={STATUS_OPTIONS} ...  className="text-xs py-1.5" />
  <Select options={catOptions} ... className="text-xs py-1.5" />
</div>

// AFTER
<div className="flex flex-col sm:flex-row gap-2">
  <Select options={STATUS_OPTIONS} ... className="text-xs py-1.5 w-full sm:w-auto" />
  <Select options={catOptions} ... className="text-xs py-1.5 w-full sm:w-auto" />
</div>
```

**Files:** `src/pages/citizen/MyReportsPage.tsx`  
**Verify:** `npm run build` — no errors.

---

## 15. `src/pages/citizen/ReportDetailPage.tsx` — Image and resolution photos

**Issues found:**
- Primary image: `<div className="rounded-xl overflow-hidden aspect-video bg-gray-100">` — this already uses `aspect-video` (16:9) with `w-full h-full object-cover`. No change needed.
- Resolution after-images: `<img ... className="w-20 h-20 rounded-lg object-cover" />` — fixed 80×80px. Fine.
- All-photos grid: `<div className="grid grid-cols-3 gap-2">` — at 320px each cell is (320 - 32 padding - 16 gap) / 3 ≈ 90px. `aspect-square rounded-lg object-cover` images scale to fill. This is fine.
- The back button `<button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">` is 20px with no padding — below 44px touch target.
- `pb-8` at the bottom — fine.
- Timeline dots: width/height `w-2.5 h-2.5` (10px) plus the flex layout — fine, the dot doesn't need a touch target.

**Changes:**

### Back button — touch target
```tsx
// BEFORE
<button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
  <ChevronLeft className="w-5 h-5" />
</button>

// AFTER
<button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 p-2 -ml-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
  <ChevronLeft className="w-5 h-5" />
</button>
```

**Files:** `src/pages/citizen/ReportDetailPage.tsx`  
**Verify:** `npm run build` — no errors.

---

## 16. `src/pages/citizen/NotificationsPage.tsx` — No structural changes needed

**Audit result:** The page uses `w-full text-left` buttons, `flex-1 min-w-0` text containers, `line-clamp-2`, and `shrink-0` unread dots. The layout is mobile-first and will not cause overflow at 320px. The only concern is the header row:

```tsx
<div className="flex items-center justify-between">
  <h1 className="font-bold text-xl text-gray-900">
    Notifications {data?.unread ? <span ...>({data.unread} new)</span> : ''}
  </h1>
  {data?.unread ? <Button variant="ghost" size="sm" ...>Mark all read</Button> : null}
</div>
```

At 320px with a long unread count badge, the heading + button might wrap. Add `min-w-0` and `gap-2` to the flex row and `truncate` to the h1.

**Changes:**

```tsx
// BEFORE
<div className="flex items-center justify-between">
  <h1 className="font-bold text-xl text-gray-900">

// AFTER
<div className="flex items-center justify-between gap-2">
  <h1 className="font-bold text-xl text-gray-900 min-w-0 truncate">
```

**Files:** `src/pages/citizen/NotificationsPage.tsx`  
**Verify:** `npm run build` — no errors.

---

## 17. `src/pages/citizen/ProfilePage.tsx` — No structural changes needed

**Audit result:** Cards use `w-full` inputs, all forms are single-column. The avatar + text row uses `flex items-center gap-4` — at 320px this is 64px avatar + 16px gap + remaining ≈ 240px text. The name is `text-lg` which may truncate long names. Add `min-w-0` to the text column.

**Changes:**

```tsx
// BEFORE
<div>
  <div className="font-semibold text-gray-900 text-lg">{user?.name}</div>

// AFTER
<div className="min-w-0">
  <div className="font-semibold text-gray-900 text-lg truncate">{user?.name}</div>
```

**Files:** `src/pages/citizen/ProfilePage.tsx`  
**Verify:** `npm run build` — no errors.

---

## 18. `src/pages/admin/AdminDashboard.tsx` — Stat grid and chart responsiveness

**Issues found:**
- Stat cards grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4` — at 320px two columns: (320 - 32 - 16) / 2 ≈ 136px per card. The card has `flex items-center gap-4` with a `w-12 h-12` icon (48px) + 16px gap + text. At 136px total, the text column is only 72px — too narrow for `text-2xl` numbers. Switch to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` (the design spec says `lg:grid-cols-4` as minimum, but 10 cards exist; `lg:grid-cols-5` is correct for 10).
- All Recharts components already use `<ResponsiveContainer width="100%" height={220}>` — no changes needed there.
- The "By Category" bar chart has `YAxis width={110}` — at mobile this takes 110px from a potentially 300px container, leaving only 190px for the bars. Reduce to `width={80}` on mobile. Since ResponsiveContainer can't conditionally set props without JS, use a fixed `width={80}` which is acceptable on all screen sizes.
- The `StatCard` component uses `flex items-center gap-4` with `w-12 h-12` icon — at 1-column on mobile this is fine; plenty of space. No inner change needed.
- The `AdminLayout` wraps this page — `<main className="flex-1 overflow-y-auto p-4 md:p-6">` from item 4 handles the outer padding.

**Changes:**

### Stat cards grid
```tsx
// BEFORE
className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"

// AFTER
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
```
(Also apply to the skeleton loading grid.)

### By Category chart YAxis
```tsx
// BEFORE
<YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />

// AFTER
<YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
```

**Files:** `src/pages/admin/AdminDashboard.tsx`  
**Verify:** `npm run build` — no errors. At 768px, confirm stat cards go 2-column, at 1024px+ they go 5-column.

---

## 19. `src/pages/admin/AdminReportsPage.tsx` — Table horizontal scroll + filter layout

**Issues found:**
- The table wrapper already has `<div className="overflow-x-auto">` ✅. However, the filter bar above the table uses `flex flex-wrap gap-3` with a fixed `w-56` search input and fixed `w-40`, `w-36`, `w-44` selects — at 320px these all overflow since `flex-wrap` wraps them into multiple rows, but the fixed widths on each cause them to exceed the container. Replace with `w-full` on mobile.
- The Actions column buttons (`<div className="flex gap-1">`) have 5 buttons of `p-1.5` each — fine for the table context since the table scrolls horizontally.
- The `whitespace-nowrap` on the Date column (`td className="... whitespace-nowrap"`) is correct and present ✅.
- The Action column buttons are not `whitespace-nowrap` as a td — add it to prevent wrapping.

**Changes:**

### Filter bar — responsive widths
```tsx
// BEFORE
<div className="flex flex-wrap gap-3 mb-6">
  <div className="relative">
    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
    <input
      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-56"
      ...
    />
  </div>
  <Select ... className="w-40 text-sm" />
  <Select ... className="w-36 text-sm" />
  <Select ... className="w-44 text-sm" />

// AFTER
<div className="flex flex-wrap gap-3 mb-6">
  <div className="relative w-full sm:w-56">
    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
    <input
      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
      ...
    />
  </div>
  <Select ... className="w-full sm:w-40 text-sm" />
  <Select ... className="w-full sm:w-36 text-sm" />
  <Select ... className="w-full sm:w-44 text-sm" />
```

### Actions cell — whitespace-nowrap
```tsx
// BEFORE
<td className="px-4 py-3">
  <div className="flex gap-1">

// AFTER
<td className="px-4 py-3 whitespace-nowrap">
  <div className="flex gap-1">
```

**Files:** `src/pages/admin/AdminReportsPage.tsx`  
**Verify:** `npm run build` — no errors. At 768px, confirm table scrolls horizontally and filter bar wraps gracefully.

---

## 20. `src/pages/admin/AdminUsersPage.tsx` — Table wrap + filter

**Issues found:**
- Table wrapper: `<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">` — no `overflow-x-auto` on an inner div, so the table will not scroll horizontally on narrow screens. Add `overflow-x-auto`.
- Filter bar: same fixed-width inputs as AdminReportsPage.

**Changes:**

### Add overflow-x-auto wrapper around table
```tsx
// BEFORE
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <table className="w-full text-sm">

// AFTER
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
    ...
    </table>
  </div>
</div>
```

### Filter — responsive widths
```tsx
// BEFORE
<input className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-56" ... />
<Select ... className="w-36 text-sm" />

// AFTER
<div className="relative w-full sm:w-56">
  <input className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full" ... />
</div>
<Select ... className="w-full sm:w-36 text-sm" />
```

### Joined and Actions columns — whitespace-nowrap
```tsx
// Add whitespace-nowrap to the Joined td (formatDate output) and Actions td:
<td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(u.createdAt)}</td>
// Actions cell already has a single small icon — no change needed there.
```

**Files:** `src/pages/admin/AdminUsersPage.tsx`  
**Verify:** `npm run build` — no errors.

---

## 21. `src/pages/admin/AdminAuditPage.tsx` — Table horizontal scroll

**Issues found:**
- The outer wrapper has `<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">` and the inner `<div className="overflow-x-auto">` is already present ✅.
- The Details column has `max-w-[200px] truncate` — correct.
- The Date column has `whitespace-nowrap` — correct ✅.
- The Action badge column has no `whitespace-nowrap` on the `<td>` — add it to prevent wrapping.
- The filter bar is not present on this page — no change needed.
- The loading skeleton loop: `Array(10).fill(0).map((_, i) => ...)` — correct.

**Changes:**

### Action badge td — prevent wrapping
```tsx
// BEFORE
<td className="px-4 py-3">
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ...`}>

// AFTER
<td className="px-4 py-3 whitespace-nowrap">
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ...`}>
```

**Files:** `src/pages/admin/AdminAuditPage.tsx`  
**Verify:** `npm run build` — no errors.

---

## 22. `src/pages/admin/AdminDepartmentsPage.tsx` — No structural changes needed

**Audit result:** The page uses a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` card grid — starts at 1 column on mobile, which is correct. Cards use `p-5` with standard text sizes. No overflow issues.

The `<Modal>` for creating a department uses the updated Modal from item 9. No page-level changes needed.

**Files:** No changes needed.  
**Verify:** `npm run build` — no errors.

---

## 23. `src/pages/admin/AdminMapPage.tsx` — Map height

**Issues found:**
- Map container: `style={{ height: 'calc(100vh - 260px)' }}` — this assumes a specific header+filter height. In the AdminLayout after item 4's changes, the header is `py-3 md:py-4`, so the combined header+filter height is approximately 52px header + 56px filter bar + 40px legend + 16px padding = ~164px, not 260px. The `260px` was overly conservative for desktop, not enough for mobile. Use a flex-based layout instead.
- The AdminLayout's `<main>` is already `overflow-y-auto` — the map page content can use `flex flex-col` with the map taking `flex-1`.
- Replace the inline height with a class-based approach: wrap the filter and map in a `flex flex-col` container, give the map `flex-1 min-h-[300px]`.

**Changes:**

Wrap the page content in a flex column and let the map flex-grow:
```tsx
// BEFORE (inside AdminLayout)
<div className="flex flex-wrap gap-3 mb-4">
  ...filters...
</div>
<div className="flex gap-3 mb-3 text-xs text-gray-600 flex-wrap">
  ...legend...
</div>
<div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 'calc(100vh - 260px)' }}>
  <MapContainer ...>

// AFTER
<div className="flex flex-col gap-3 h-full">
  <div className="flex flex-wrap gap-3">
    ...filters...
  </div>
  <div className="flex gap-3 text-xs text-gray-600 flex-wrap">
    ...legend...
  </div>
  <div className="rounded-xl overflow-hidden border border-gray-200 flex-1 min-h-[300px]">
    <MapContainer style={{ height: '100%', width: '100%' }} ...>
```

Also the AdminLayout's `<main>` needs `flex flex-col` to allow the child to flex-grow. Update item 4's AdminLayout main:
```tsx
// In AdminLayout.tsx (amend item 4)
<main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
```
**Note:** This only affects AdminMapPage since it is the only page that uses flex-grow on the map. All other admin pages use `space-y-*` or explicit heights so adding `flex flex-col` to main does not break them. The `overflow-y-auto` already handles scroll.

**Files:** `src/pages/admin/AdminMapPage.tsx`, `src/components/layout/AdminLayout.tsx` (amend the `<main>` className from item 4)  
**Verify:** `npm run build` — no errors. At 1024px, confirm map fills remaining height without a scrollbar on the outer page.

---

## 24. `src/pages/officer/OfficerReportsPage.tsx` — Touch targets and modal responsiveness

**Issues found:**
- Action buttons: `p-1.5 rounded hover:bg-gray-100` — each is 30px square, below 44px. There are 3 per row. At 320px the `flex gap-1` group of 3 is 3×30 + 8px gap = 98px. Fine for the layout width, but touch targets need to be 44px.
- The `<Modal>` components used here will benefit from item 9's changes (body scroll lock, responsive padding).
- The filter row: `<div className="flex items-center justify-between">` with a heading and a `<Select className="w-40 text-sm">` — at 320px, `text-xl font-bold` heading + 160px select + gap = ~300px, which fits but is snug. No change needed.

**Changes:**

### Action buttons — touch target
All three action buttons in the report card:
```tsx
// BEFORE
<button ... className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600" title="View">
<button ... className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="Update Progress">
<button ... className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600" title="Submit Resolution">

// AFTER (add min-h/min-w to each)
<button ... className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600 min-h-[44px] min-w-[44px] flex items-center justify-center" title="View">
<button ... className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 min-h-[44px] min-w-[44px] flex items-center justify-center" title="Update Progress">
<button ... className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600 min-h-[44px] min-w-[44px] flex items-center justify-center" title="Submit Resolution">
```

**Files:** `src/pages/officer/OfficerReportsPage.tsx`  
**Verify:** `npm run build` — no errors.

---

## Summary Table

| # | File | Key issues fixed |
|---|------|-----------------|
| 1 | `index.html` | viewport-fit=cover |
| 2 | `src/index.css` | overflow-x hidden, tap highlight, touch-action, iOS zoom, safe-area utilities |
| 3 | `CitizenLayout.tsx` | safe-area top/bottom, precise pb-calc, logout touch target, nav min-h |
| 4 | `AdminLayout.tsx` | hamburger touch target, responsive padding, stable Sidebar component |
| 5 | `OfficerLayout.tsx` | safe-area top/bottom, logout touch target, nav min-h, precise pb-calc |
| 6 | `Button.tsx` | min-h-[44px] touch target floor |
| 7 | `Badge.tsx` | shrink-0, whitespace-nowrap prevents squish in flex rows |
| 8 | `Input.tsx` | text-base md:text-sm prevents iOS auto-zoom |
| 9 | `Modal.tsx` | fixed backdrop, body scroll lock, responsive padding, close button touch target |
| 10 | `LoginPage.tsx`, `RegisterPage.tsx` | responsive card padding, register page scroll on short viewports |
| 11 | `CitizenHomePage.tsx` | stat grid 320px safe, quick actions min-w-0, banner name truncate |
| 12 | `ReportNewPage.tsx` | category grid compact at xs, back button touch target, map container w-full |
| 13 | `NearbyMapPage.tsx` | max-h map, stacked filters on mobile |
| 14 | `MyReportsPage.tsx` | stacked filters on mobile |
| 15 | `ReportDetailPage.tsx` | back button touch target |
| 16 | `NotificationsPage.tsx` | header row truncation |
| 17 | `ProfilePage.tsx` | avatar text min-w-0 truncate |
| 18 | `AdminDashboard.tsx` | stat grid 1→2→5 cols, chart YAxis width |
| 19 | `AdminReportsPage.tsx` | filter bar responsive widths, actions cell whitespace-nowrap |
| 20 | `AdminUsersPage.tsx` | overflow-x-auto on table, filter bar responsive widths |
| 21 | `AdminAuditPage.tsx` | action badge td whitespace-nowrap |
| 22 | `AdminDepartmentsPage.tsx` | no changes (already responsive) |
| 23 | `AdminMapPage.tsx` | flex-based map height replacing calc(100vh-260px) |
| 24 | `OfficerReportsPage.tsx` | action button touch targets |

---

## Build and test commands
```bash
cd /Users/manojprabhakar4509gmail.com/Desktop/pathhole/frontend

# Type-check + build
npm run build

# Dev server (for manual responsive testing)
npm run dev
```

After each file group is modified, run `npm run build` to confirm no TypeScript or Tailwind errors before proceeding to the next file.
