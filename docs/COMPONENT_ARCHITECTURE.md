# Component Architecture Guide

## Overview

This project follows a **Feature-First** component architecture aligned with Next.js App Router conventions. This guide defines where components should be placed and how they should be organized.

---

## Component Organization Principles

### 1. Feature-Local Components (Default)

**Location:** `src/app/[feature]/_components/`

Components that are **specific to a feature or route** live inside the `app` folder, adjacent to the routes that use them.

**Examples:**

- `src/app/hub/_components/documents/document-manager.tsx` - Unified Create/Edit/View document component
- `src/app/hub/_components/documents/documents-sidebar.tsx` - Only used in document management
- `src/app/hub/_components/libraries/settings/add-member-form.tsx` - Only used in library settings
- `src/app/(auth)/_components/login-hero.tsx` - Only used in auth flow

**When to use:**

- Component is only used within one feature/route
- Component contains business logic specific to that feature
- Component shouldn't be reused elsewhere

### 2. Shared UI Components

**Location:** `src/components/ui/`

Primitive UI components from **shadcn/ui** and **Kokonut UI**.

**Examples:**

- `src/components/ui/button.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/badge.tsx`

**Management:**

- Use `npx shadcn@latest add <component>` to add new components
- Never manually create files in this folder

### 3. Shared Layout Components

**Location:** `src/components/layout/`

Components that provide **app-wide layout and navigation**.

**Examples:**

- `src/components/layout/navbar.tsx`
- `src/components/layout/account-dropdown.tsx`
- `src/components/layout/theme-toggle.tsx`

**When to use:**

- Component appears across multiple features
- Component provides structural layout
- Component is part of the app shell

### 4. Providers

**Location:** `src/components/providers/`

React context providers and HOCs.

**Examples:**

- `src/components/providers/theme-provider.tsx`

---

## Folder Structure

```
src/
├── app/                              # Next.js App Router
│   ├── hub/
│   │   ├── _components/              # Feature-local components
│   │   │   ├── documents/
│   │   │   │   ├── document-manager.tsx    ← unified create/edit/view
│   │   │   │   ├── documents-sidebar.tsx
│   │   │   │   ├── sidebar-refresh-context.tsx
│   │   │   │   ├── block_editor/
│   │   │   │   │   ├── editor.tsx         ← BlockNote wrapper (Markdown)
│   │   │   │   │   └── custom-slash-menu-items.ts
│   │   │   │   └── index.ts              # Barrel export
│   │   │   └── libraries/
│   │   │       ├── settings/
│   │   │       │   ├── add-member-form.tsx
│   │   │       │   ├── member-table.tsx
│   │   │       │   ├── delete-library-form.tsx
│   │   │       │   ├── rename-library-form.tsx
│   │   │       │   └── index.ts      # Barrel export
│   │   │       └── hub/
│   │   │           ├── create-library-dialog.tsx
│   │   │           ├── libraries-container.tsx
│   │   │           ├── libraries-table.tsx
│   │   │           ├── library-fab.tsx
│   │   │           ├── library-grid.tsx
│   │   │           ├── library-summary-hero.tsx
│   │   │           └── index.ts      # Barrel export
│   │   ├── chat/
│   │   │   ├── _components/
│   │   │   │   └── chat-client.tsx     ← unified multi-library chat UI
│   │   │   └── page.tsx               ← fetches libraries, pre-selects from ?libraryId=
│   │   ├── libraries/
│   │   │   └── [id]/
│   │   │       ├── chat/              ← redirects to /chat?libraryId=[id]
│   │   │       ├── documents/
│   │   │       └── settings/
│   │   └── page.tsx
│   ├── (auth)/
│   │   ├── _components/
│   │   │   └── login-hero.tsx
│   │   └── login/
│   └── api/
├── components/                        # Shared components
│   ├── ui/                           # shadcn primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── kokonutui/                    # Kokonut UI components
│   │   └── ai-text-loading.tsx       ← animated loading text for chat
│   ├── layout/                       # App-wide layouts
│   │   ├── navbar.tsx
│   │   ├── account-dropdown.tsx
│   │   └── ...
│   └── providers/                    # Context providers
│       └── theme-provider.tsx
└── lib/                              # Utilities, hooks, actions
    ├── actions/
    ├── ai/
    ├── hooks/
    │   └── useAutoSave.ts            ← hybrid draft save hook
    ├── supabase/
    ├── validation/
    └── utils.ts
```

---

## Import Patterns

### Importing Feature-Local Components

**Within the same feature:**

```typescript
import { DocumentManager } from "./DocumentManager";
```

**From another feature:**

```typescript
import { DocumentManager } from "@/app/hub/_components/documents/DocumentManager";
```

### Importing Shared Components

```typescript
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
```

### Using Barrel Exports

Barrel exports (`index.ts`) enable cleaner imports:

```typescript
// Instead of:
import { DocumentManager } from "@/app/hub/_components/documents/DocumentManager";
import { DocumentsSidebar } from "@/app/hub/_components/documents/DocumentsSidebar";

// Use:
import {
  DocumentManager,
  DocumentsSidebar,
} from "@/app/hub/_components/documents";
```

---

## Barrel Export Guidelines

### When to Create Barrel Exports

Create an `index.ts` barrel export when:

1. A component folder has 3+ components
2. Components are commonly imported together
3. The folder represents a cohesive feature module

### Barrel Export Format

```typescript
// ✅ GOOD - Named exports only
export { ComponentA } from "./ComponentA";
export { ComponentB } from "./ComponentB";
export { useHook } from "./useHook";

// ❌ BAD - No default exports
export default ComponentA;

// ❌ BAD - No wildcard exports (breaks tree-shaking)
export * from "./ComponentA";
```

---

## Component Naming Conventions

### File Names

- **kebab-case** for ALL files: `document-form.tsx`, `member-table.tsx`, `use-auth.ts`, `format-date.ts`

### Component Names

- **PascalCase** for React components: `DocumentForm`, `MemberTable`
- **camelCase** for React hooks: `useAuth`, `useSidebarRefresh`
- **Descriptive Names**: `AddMemberForm` not `MemberForm`

---

## Decision Tree: Where Does My Component Go?

```
Is this component a shadcn/Kokonut primitive?
├─ YES → src/components/ui/ (use npx shadcn add)
└─ NO
   ├─ Is it used app-wide (navbar, layout, providers)?
   │  ├─ YES → src/components/layout/ or src/components/providers/
   │  └─ NO
   │     ├─ Is it specific to one feature/route?
   │     ├─ YES → src/app/[feature]/_components/[subfeature]/
   │     └─ NO (truly shared across features)
   │        └─ src/components/[feature-name]/ (create if needed)
   └─ Is it a React hook?
      ├─ YES → src/lib/hooks/ or src/app/[feature]/_components/
      └─ NO → Follow above rules
```

---

## Anti-Patterns to Avoid
 
 ### ❌ Don't Use Raw HTML Form Elements
 
 Always use **shadcn/ui** primitives (`Input`, `Select`, `Textarea`, `Label`, etc.) instead of raw HTML elements to ensure accessibility and consistent styling.

### ❌ Don't Mix Concerns

```typescript
// BAD: Feature component in shared folder
src / components / document-manager.tsx; // Only used in hub feature

// GOOD
src / app / hub / _components / documents / document-manager.tsx;
```

### ❌ Don't Create Deep Nesting

```typescript
// BAD: Too many levels
src /
  app /
  hub /
  _components /
  documents /
  list /
  pagination /
  PaginationControls.tsx;

// GOOD
src / app / hub / _components / documents / PaginationControls.tsx;
```

### ❌ Don't Import from Deep Paths

```typescript
// BAD
import { AddMemberForm } from "../../../../_components/libraries/settings/AddMemberForm";

// GOOD
import { AddMemberForm } from "@/app/hub/_components/libraries/settings";
```

### ❌ Don't Put Business Logic in Shared Components

```typescript
// BAD: Shared component with feature-specific logic
src / components / member-table.tsx; // Contains library-specific RBAC

// GOOD
src / app / hub / _components / libraries / settings / member-table.tsx;
```

---

## Route Guards & RBAC (2026)

### Authentication Guard
- Implemented in `middleware.ts`.
- Redirects unauthenticated users from `/hub*` to `/login`.
- Redirects authenticated users from `/login` to `/hub`.

### Authorization (RBAC) Guard
- Implemented in `src/app/hub/libraries/[id]/layout.tsx` using `requireLibraryRole()`.
- All library and document management routes are protected by server-side RBAC checks.
- Unauthorized users on restricted routes render an inline `Unauthorized` component while keeping the same route URL.

### Unauthorized Page
- Centralized at `src/app/unauthorized/page.tsx` for consistent UX when directly accessing the unauthorized page.

**Pattern:**
- Use middleware for global authentication redirects.
- Use server-side guards for RBAC (library/document membership and roles).

---

## Migration Notes

### From Old Structure (Pre-April 2026)

**Old paths (DO NOT USE):**

- `src/components/documents/` → Now `src/app/hub/_components/documents/`
- `src/components/library-settings/` → Now `src/app/hub/_components/libraries/settings/`
- `src/app/hub/[id]/documents/` → Now `src/app/hub/libraries/[id]/documents/`
- `src/app/[id]/settings/` → Now `src/app/hub/libraries/[id]/settings/`
- `src/app/hub/libraries/[id]/documents/[docId]/edit/` → **Deleted** (editing now happens inline in `[docId]/page.tsx` via `DocumentManager`)

---

## Related Documentation

- [Document Management Guide](./DOCUMENT_MANAGEMENT_GUIDE.md)
- [Library Management Guide](./LIBRARY_MANAGEMENT_GUIDE.md)
- [AGENTS.md](../AGENTS.md) - Project overview and conventions
- [Next.js Instructions](../.github/instructions/nextjs.instructions.md)

---
