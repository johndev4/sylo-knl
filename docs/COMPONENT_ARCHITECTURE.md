# Component Architecture Guide

## Overview

This project follows a **Feature-First** component architecture aligned with Next.js App Router conventions. This guide defines where components should be placed and how they should be organized.

---

## Component Organization Principles

### 1. Feature-Local Components (Default)

**Location:** `src/app/[feature]/_components/`

Components that are **specific to a feature or route** live inside the `app` folder, adjacent to the routes that use them.

**Examples:**

- `src/app/hub/_components/documents/DocumentManager.tsx` - Unified Create/Edit/View document component
- `src/app/hub/_components/documents/DocumentsSidebar.tsx` - Only used in document management
- `src/app/hub/_components/libraries/settings/AddMemberForm.tsx` - Only used in library settings
- `src/app/(auth)/_components/LoginHero.tsx` - Only used in auth flow

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

- `src/components/layout/Navbar.tsx`
- `src/components/layout/AccountDropdown.tsx`
- `src/components/layout/ThemeToggle.tsx`

**When to use:**

- Component appears across multiple features
- Component provides structural layout
- Component is part of the app shell

### 4. Providers

**Location:** `src/components/providers/`

React context providers and HOCs.

**Examples:**

- `src/components/providers/ThemeProvider.tsx`

---

## Folder Structure

```
src/
├── app/                              # Next.js App Router
│   ├── hub/
│   │   ├── _components/              # Feature-local components
│   │   │   ├── documents/
│   │   │   │   ├── DocumentManager.tsx    ← unified create/edit/view
│   │   │   │   ├── DocumentsSidebar.tsx
│   │   │   │   ├── SidebarRefreshContext.tsx
│   │   │   │   ├── block_editor/
│   │   │   │   │   ├── Editor.tsx         ← BlockNote wrapper (Markdown)
│   │   │   │   │   └── custom-slash-menu-items.ts
│   │   │   │   └── index.ts              # Barrel export
│   │   │   └── libraries/
│   │   │       ├── settings/
│   │   │       │   ├── AddMemberForm.tsx
│   │   │       │   ├── MemberTable.tsx
│   │   │       │   ├── DeleteLibraryForm.tsx
│   │   │       │   ├── RenameLibraryForm.tsx
│   │   │       │   └── index.ts      # Barrel export
│   │   │       └── hub/
│   │   │           ├── CreateLibraryDialog.tsx
│   │   │           ├── LibrariesContainer.tsx
│   │   │           ├── LibrariesTable.tsx
│   │   │           ├── LibraryFab.tsx
│   │   │           ├── LibraryGrid.tsx
│   │   │           ├── LibrarySummaryHero.tsx
│   │   │           └── index.ts      # Barrel export
│   │   ├── libraries/
│   │   │   └── [id]/
│   │   │       ├── chat/
│   │   │       ├── documents/
│   │   │       └── settings/
│   │   └── page.tsx
│   ├── (auth)/
│   │   ├── _components/
│   │   │   └── LoginHero.tsx
│   │   └── login/
│   └── api/
├── components/                        # Shared components
│   ├── ui/                           # shadcn/Kokonut primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── layout/                       # App-wide layouts
│   │   ├── Navbar.tsx
│   │   ├── AccountDropdown.tsx
│   │   └── ...
│   └── providers/                    # Context providers
│       └── ThemeProvider.tsx
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

- **PascalCase** for components: `DocumentForm.tsx`, `MemberTable.tsx`
- **camelCase** for hooks: `useSidebarRefresh.ts`, `useAuth.ts`
- **kebab-case** for utilities: `format-date.ts` (if separate files)

### Component Names

- Match the filename: `DocumentForm.tsx` exports `DocumentForm`
- Use descriptive names: `AddMemberForm` not `MemberForm`
- Prefix hooks with `use`: `useSidebarRefresh`

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
src / components / DocumentManager.tsx; // Only used in hub feature

// GOOD
src / app / hub / _components / documents / DocumentManager.tsx;
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
src / components / MemberTable.tsx; // Contains library-specific RBAC

// GOOD
src / app / hub / _components / libraries / settings / MemberTable.tsx;
```

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
