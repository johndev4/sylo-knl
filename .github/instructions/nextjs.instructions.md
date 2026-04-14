---
description: "Use when creating components, pages, layouts, or features in the Next.js web app. Enforces server-first RSC architecture, TypeScript strict mode, path aliases, security best practices, and Tailwind CSS conventions."
name: "Next.js Development Guidelines"
applyTo: "apps/web/**/*.{ts,tsx}"
---

# Next.js Development Guidelines

This document standardizes development patterns for our Next.js application (v16.1.7, React 19, Tailwind CSS).

## 1. Architectural Conventions

### Server-First Default (React Server Components)

- **Default to RSC**: All components should be React Server Components by default.
- **Use "use client" sparingly**: Add `"use client"` only when a component requires interactivity (hooks like `useState`, `useEffect`, `useContext`, or event handlers).
- **Benefits**: Reduces JavaScript bundle size, enables server-side operations, improves security.

**Example:**
```tsx
// ✓ Good: Server Component (can fetch data, access database)
export default async function SpaceList() {
  const spaces = await fetchSpaces();
  return (
    <div>
      {spaces.map(space => <SpaceCard key={space.id} space={space} />)}
    </div>
  );
}

// ✓ Good: Client Component (interactivity needed)
"use client";
import { useState } from "react";

export function SearchFilter() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

### App Router & File-System Routing

- Use the **App Router** (`app/` directory) exclusively.
- Follow file-system conventions:
  - `page.tsx`: Route segment rendering
  - `layout.tsx`: Shared layout for segment and children
  - `loading.tsx`: Fallback UI during async operations
  - `error.tsx`: Error boundary for segment
  - `not-found.tsx`: Custom 404 page

### Colocation Over Flat Structure

- Prefer **feature-based folders** within `app/` with colocated components, styles, and utilities.
- Do NOT use the flat `components/` directory for new feature work.
- Colocate CSS Modules and utilities alongside their consumers.

**Preferred structure:**
```
app/
  entries/
    [id]/
      components/
        entry-header.tsx
        entry-form.tsx
      page.tsx
      loading.tsx
      styles.module.css
    new/
      page.tsx
```

---

## 2. Coding Rules & Logic

### TypeScript-First with Strict Mode

- **Enforce `strict: true`** in `tsconfig.json` (already configured).
- **Never use `any`** unless absolutely unavoidable; document why if used.
- **Use `interface` over `type`** for public APIs and exported contracts.
- **Use `type`** for union types, tuples, and mapped types.

**Example:**
```tsx
// ✓ Good: interface for public API
interface SpaceDTO {
  id: string;
  name: string;
  createdAt: Date;
}

// ✓ Good: type for internal union
type FilterOption = "recent" | "popular" | "trending";

// ✓ Good: strict typing for props
interface EntryFormProps {
  spaceId: string;
  initialValues?: EntryDTO;
  onSubmit: (data: EntryDTO) => Promise<void>;
}

export function EntryForm({ spaceId, initialValues, onSubmit }: EntryFormProps) {
  // implementation
}
```

### Path Aliases (Mandatory)

- **Always use path aliases** instead of relative paths (`../../`).
- Configured aliases: `@/components/*`, `@/lib/*`.
- Extend aliases in `tsconfig.json` as new directories are created.

**Required:**
```tsx
// ✓ Good
import { SpaceSelector } from "@/components/space-selector";
import { formatDate } from "@/lib/date-utils";

// ✗ Avoid
import { SpaceSelector } from "../../components/space-selector";
import { formatDate } from "../../../lib/date-utils";
```

### Naming Standards

- **Components (inside code)**: PascalCase (e.g., `UserProfile`, `EntryForm`)
- **Files**: kebab-case (e.g., `user-profile.tsx`, `entry-form.tsx`, `auth-panel.tsx`)
- **Folders**: kebab-case (e.g., `components/space-selector/`, `app/entries/`)
- **Utilities & functions**: camelCase (e.g., `formatDate()`, `validateEmail()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `API_BASE_URL`)

**Example:**
```
components/
  entry-form/
    entry-form.tsx        // Component
    entry-form.module.css // Styles
    validateEntryForm.ts  // Helper function
    constants.ts          // VALIDATION_RULES, MAX_TITLE_LENGTH
```

### Barrel Files (Index.ts) — Use Cautiously

- **Avoid barrel files within feature modules** (risk of circular dependencies).
- **Use barrel files for public APIs** to define clean export surfaces (e.g., `@/components/ui/index.ts` exporting all shadcn/ui components).
- **Prefer direct imports** from source files within internal feature folders.

**Recommended:**
```tsx
// ✓ Good: Direct import within feature
import { EntryForm } from "@/app/entries/forms/entry-form";

// ✓ Good: Public API barrel (intentional)
import { Button, Card, Dialog } from "@/components/ui";
// (components/ui/index.ts exports all shadcn/ui components)

// ✗ Avoid: Internal barrel file
import { validateEntry } from "@/lib/validators";
// (promotes circular imports; import from validate-entry directly)
```

**Rule of thumb:** Barrel exports are fine for curated, stable public APIs; avoid them for internal module organization.

---

## 3. Security Best Practices

### Input Sanitization & Validation

- **Always validate and sanitize user input** at component and API boundaries.
- Use **Zod** (or similar schema validation library) for runtime validation.
- Validate in Server Actions and API routes before processing.

**Example:**
```tsx
// Server Action with validation
"use server"
import { z } from "zod";

const createEntrySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  spaceId: z.string().uuid(),
});

export async function createEntry(formData: unknown) {
  try {
    const validated = createEntrySchema.parse(formData);
    // Process validated data
  } catch (error) {
    return { error: "Invalid input" };
  }
}
```

### Environment Variables

- **Strictly forbid hardcoded secrets** (API keys, database URLs, tokens).
- Store all secrets in `.env.local` (or equivalent CI/CD secret manager).
- Use `process.env` to access variables; **never expose secrets in browser-accessible code**.
- Prefix client-exposed variables with `NEXT_PUBLIC_` only when absolutely necessary.

**Required:**
```tsx
// ✓ Good: Server-only secret
const dbPassword = process.env.DATABASE_PASSWORD;

// ✓ Good: Client variable (explicitly public)
const apiEndpoint = process.env.NEXT_PUBLIC_API_URL;

// ✗ Avoid: Hardcoded secrets
const apiKey = "sk_live_abc123xyz";

// ✗ Avoid: Exposing secrets in client code
const secret = process.env.STRIPE_SECRET_KEY; // Will be undefined in browser
```

### Server Actions Security

- Implement **authorization checks** in all Server Actions before mutating data.
- **Validate and sanitize input** using schema validation.
- **Never return sensitive data** (passwords, tokens) from actions.
- Log mutations for audit trails.

**Example:**
```tsx
"use server"
import { z } from "zod";
import { authenticate } from "@/lib/auth";

const updateEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function updateEntry(formData: unknown) {
  // 1. Authenticate
  const user = await authenticate();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Validate input
  const { id, title, content } = updateEntrySchema.parse(formData);

  // 3. Authorize (check ownership)
  const entry = await getEntryById(id);
  if (entry.userId !== user.id) {
    throw new Error("Forbidden");
  }

  // 4. Mutate safely
  return await db.entries.update(id, { title, content });
}
```

### Proxy (formerly Middleware) 

**Note:** `middleware.ts` is deprecated in v16+. Use `proxy.ts` instead.

- **Create `proxy.ts`** at `app/` root to handle middleware concerns (auth, headers, redirects).
- **Use `matcher` config** to target specific routes.
- Implement **auth redirects, header manipulation, CORS logic**.
- Keep proxy logic lightweight; delegates to handlers for heavy operations.

**Example Proxy:**
```tsx
// apps/web/app/proxy.ts
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Redirect unauthenticated users
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('X-Custom-Header', 'value');
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

### API Routes Security (apps/api)

- **Implement authentication middleware** on all protected routes.
- **Validate request body and query parameters** using schema validation.
- **Return appropriate HTTP status codes** (401 Unauthorized, 403 Forbidden, 400 Bad Request).
- **Log requests and errors** without exposing sensitive details.
- **Use HTTPS in production** and enforce secure cookie settings.

**Example:**
```tsx
// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  try {
    const user = await verifyToken(token);
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
```

### Dependency Management

- **Run `npm audit` after installing dependencies** to identify vulnerabilities.
- **Address high and critical vulnerabilities immediately**.
- **Keep dependencies up-to-date** using latest stable versions.
- **Pin workspace packages** to prevent unexpected breaking changes.
- Document justification for any outdated or vulnerable dependencies that cannot be updated.

**Commands:**
```bash
npm audit              # Check for vulnerabilities
npm audit fix          # Auto-fix available vulnerabilities
npm update             # Update to latest compatible versions
npm view <package> version  # Check latest stable version
```

---

## 4. Performance & UI

### Image Optimization

- **Use `next/image` component** for all images.
- **Always provide `alt` text** (descriptive, not empty).
- **Define `width` and `height`** or use `fill` with proper `sizes` attribute.
- Avoid inline `<img>` tags.

**Required:**
```tsx
// ✓ Good: With explicit dimensions
import Image from "next/image";

export function SpaceCard({ space }: { space: Space }) {
  return (
    <Image
      src={space.imageUrl}
      alt={`${space.name} cover image`}
      width={400}
      height={300}
      priority={false}
    />
  );
}

// ✓ Good: With fill
<Image
  src={imageUrl}
  alt="Entry preview"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>

// ✗ Avoid
<img src={imageUrl} alt="" />
```

### UI Libraries: Tailwind CSS + shadcn/ui

- **Use Tailwind CSS** for styling (v3.4.16, configured).
- **Use shadcn/ui components** for pre-built, accessible UI elements (Button, Dialog, Form, etc.).
- Avoid inline styles or alternative CSS libraries (e.g., styled-components, emotion).
- Extend shadcn/ui components with Tailwind utility classes as needed.

**shadcn/ui Integration:**
```tsx
// Install: npx shadcn-ui@latest add button

import { Button } from "@/components/ui/button";

export function Actions() {
  return (
    <>
      <Button variant="default">Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost" size="sm">Ghost Small</Button>
    </>
  );
}
```

**Custom Components with Tailwind:**
```tsx
// ✓ Good: Combine shadcn/ui + custom Tailwind
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SpaceCard({ space }: { space: Space }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{space.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-600">{space.description}</p>
      </CardContent>
    </Card>
  );
}
```

**Guidelines:**
- Install shadcn/ui components into `components/ui/` (auto-generated).
- Customize component styles in `components/ui/` if needed.
- Don't override shadcn/ui styling; use composition with Tailwind utilities.

### Accessibility (A11y)

- Use **semantic HTML** (`<button>`, `<form>`, `<nav>`, `<main>`).
- Include **ARIA attributes** where semantic HTML is insufficient (e.g., `aria-label`, `aria-describedby`, `role`).
- Ensure **keyboard navigability** (Tab, Enter, Escape).
- Maintain sufficient **color contrast** (WCAG AA minimum).
- Test with screen readers (NVDA, JAWS) and keyboard-only navigation.

**Example:**
```tsx
// ✓ Good: Semantic and accessible
export function NavBar() {
  return (
    <nav className="bg-white shadow">
      <ul className="flex gap-4">
        <li><a href="/entries" className="p-2">Entries</a></li>
        <li><a href="/spaces" className="p-2">Spaces</a></li>
      </ul>
    </nav>
  );
}

// ✓ Good: ARIA when needed
<div role="alert" aria-live="polite" aria-label="Error message">
  {error}
</div>
```

### Code Splitting & Dynamic Imports

- Use **dynamic imports** for large components or heavy libraries to reduce initial bundle size.
- Leverage Next.js `dynamic()` API for automatic code splitting.

**Example:**
```tsx
import dynamic from "next/dynamic";

// Load AIPanel only when needed
const AIPanel = dynamic(() => import("@/components/ai-suggestions-panel"), {
  loading: () => <div>Loading AI suggestions...</div>,
  ssr: false, // Disable SSR if component has client-only dependencies
});

export function EntryView() {
  const [showAI, setShowAI] = useState(false);
  return (
    <>
      <button onClick={() => setShowAI(true)}>Show AI Suggestions</button>
      {showAI && <AIPanel />}
    </>
  );
}
```

### State Management

- **Prefer Server Components** for data fetching (no client state needed).
- **Use React `useState`** for UI-only state (form inputs, toggles, modals).
- **Use TanStack Query (React Query)** when you need:
  - Async state (API fetching, caching, background sync)
  - Normalized cache across components
  - Request deduplication and stale-while-revalidate patterns
- **Avoid Redux** — complexity rarely justified in Server Component architecture.

**Current approach:**
```tsx
// ✓ Good: Server Component (no state needed)
export default async function EntriesList() {
  const entries = await fetchEntriesForUser();
  return <ul>{entries.map(e => <EntryItem key={e.id} entry={e} />)}</ul>;
}

// ✓ Good: Client state for UI only
"use client"
import { useState } from "react";

export function SearchBox() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}

// ✓ Advanced: Async state with TanStack Query (when installed)
"use client"
import { useQuery } from '@tanstack/react-query';

export function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  
  if (isLoading) return <div>Loading...</div>;
  return <div>{user?.name}</div>;
}
```

### Testing & shadcn/ui

- **Recommended: Jest + React Testing Library** for unit and integration tests.
- Write tests alongside components (colocated in same folder structure).
- Prioritize integration tests over unit tests; test user behavior, not implementation.
- Use `screen` queries to select elements as users would (`getByRole`, `getByLabelText`).

**Setup (when ready):**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

**Jest Configuration (`jest.config.ts`):**
```ts
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default createJestConfig(config);
```

**Example Test (colocated):**
```tsx
// components/entry-form/entry-form.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryForm } from "./entry-form";

describe("EntryForm", () => {
  it("submits form with valid data", async () => {
    const mockSubmit = jest.fn();
    render(<EntryForm onSubmit={mockSubmit} spaceId="123" />);
    
    await userEvent.type(screen.getByLabelText(/title/i), "New Entry");
    await userEvent.type(screen.getByLabelText(/content/i), "Entry content");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: "New Entry",
      content: "Entry content",
    }));
  });
});
```

---

## 5. Data Fetching & Caching Strategies (Next.js 16)

Next.js 16 introduces granular caching control via `use cache`, `cacheLife()`, and cache tagging. Proper caching is critical for performance.

### Request Memoization & Automatic Caching

**Built-in behavior:**
- Identical `fetch()` calls within a single render are automatically deduped
- GET/HEAD requests are cached by default (per-request scope)
- POST requests and custom functions with `React.cache()` extend memoization

```tsx
// Request memoization (automatic)
// Both calls execute once, result shared within render
const user = await fetch(`/api/user/${id}`)
const profile = await fetch(`/api/user/${id}`)  // Same request, not duplicated

// For non-fetch data (database, custom logic)
import { cache } from 'react';

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

// Called multiple times in same render, executed once
const user1 = await getUser(userId);
const user2 = await getUser(userId);  // Uses memoized result
```

### Cache Components & Partial Prerendering (PPR)

**When enabled** (`cacheComponents: true` in `next.config.ts`):
- Use `'use cache'` directive to mark cacheable sections
- Use `cacheLife()` to set cache duration (e.g., `'hours'`, `'day'`, `'weeks'`)
- Combine with `<Suspense>` for hybrid static/dynamic rendering

```tsx
// app/dashboard/page.tsx
'use cache'
import { cacheLife } from 'next/cache';

export default async function Dashboard() {
  cacheLife('hours')  // Cache for 1 hour
  
  const stats = await fetchStats();  // Prerendered at build time
  
  return <div>{stats}</div>;
}

// For dynamic sections, use Suspense
import { Suspense } from 'react';

function Layout() {
  return (
    <Suspense fallback={<Skeleton />}>
      <SlowUserWidget />  {/* Streams separately */}
    </Suspense>
  );
}
```

### Tag-Based Revalidation (On-Demand)

**Use when you need to invalidate specific data** (e.g., after form submission):

```tsx
// app/lib/data.ts
export async function getPosts() {
  return fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }  // Tag this request
  }).then(res => res.json());
}

// app/actions.ts (Server Action)
'use server'
import { revalidateTag } from 'next/cache';

export async function createPost(data: PostData) {
  // Create post in database
  const post = await db.posts.create(data);
  
  // Invalidate all requests tagged with 'posts'
  revalidateTag('posts');
  
  return post;
}
```

### Time-Based Revalidation (ISR)

**Use for data that updates periodically:**

```tsx
// Revalidate every 3600 seconds (1 hour)
const posts = await fetch('https://api.example.com/posts', {
  next: { revalidate: 3600 }
});

// Disable caching (always fresh)
const live = await fetch('https://api.example.com/live', {
  cache: 'no-store'
});

// Force revalidation on demand
import { revalidatePath } from 'next/cache';

export async function refreshPage() {
  'use server';
  revalidatePath('/posts');  // Regenerate /posts and all dynamic routes in segment
}
```

**Caching Strategy Decision Tree:**
```
Do you need the latest data on every request?
  ├─ YES → cache: 'no-store'
  └─ NO:
     ├─ Known update frequency? → next: { revalidate: 3600 }
     └─ Invalidate on specific event? → next: { tags: ['key'] } + revalidateTag()
```

---

## 6. Advanced Routing Patterns

### Parallel Routes

**Render multiple pages/sections in the same layout simultaneously** (useful for dashboards, modals, conditional UI).

**Convention:** Use `@slotName` folders as props to the layout.

```
app/
  dashboard/
    @analytics/
      page.tsx         → analytics prop
    @team/
      page.tsx         → team prop
    layout.tsx         ← receives both slots
    page.tsx           → default children
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <aside>{analytics}</aside>
      <main>{children}</main>
      <aside>{team}</aside>
    </div>
  );
}
```

**Benefits:**
- Independent loading states per slot (each can have own `loading.tsx`)
- Conditional rendering (e.g., revert a slot without reloading others)
- Isolated error boundaries per slot

### Intercepting Routes

**Load a route without triggering full page navigation** (common for modals over feeds, shareable modal URLs).

**Convention:** Use `(..)` prefix in folder names to intercept parent segments.
- `(.)` = same level
- `(..)` = one level up
- `(...)` = two levels up
- `(.)(..)` = match multiple patterns

```
app/
  photos/
    page.tsx             ← Feed
    [id]/
      page.tsx           ← Detail page
  (@modal)/(.)photos/
    [id]/
      page.tsx           ← Modal intercepting /photos/[id]
  layout.tsx             ← receives @modal slot
```

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>{children}{modal}</>
  );
}

// app/@modal/(.)photos/[id]/page.tsx
export default function PhotoModal({ params }: { params: { id: string } }) {
  return (
    <dialog>
      <img src={`/photos/${params.id}`} alt="Photo" />
    </dialog>
  );
}
```

**Behavior:**
- Navigate from `/photos` → `/photos/123`: Modal renders (intercepted)
- Direct visit to `/photos/123`: Full detail page renders (not intercepted)
- Share modal URL: Recipient sees detail page, not modal

---

## 7. Error Handling

### Error Boundaries

Use `error.tsx` to catch errors in specific route segments. Each segment can have its own boundary.

**Convention:**
- `error.tsx` catches errors in its segment and nested children
- `global-error.tsx` (in root `app/`) catches errors in the entire app (including layout)
- `not-found.tsx` handles 404s

```
app/
  error.tsx              ← Catches entire app errors
  dashboard/
    error.tsx            ← Catches dashboard + nested errors
    [id]/
      error.tsx          ← Catches specific entry errors
```

```tsx
// app/dashboard/error.tsx
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <h2 className="text-red-800 font-bold">Something went wrong</h2>
      <p className="text-red-700 mt-2">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 px-3 py-2 bg-red-600 text-white rounded"
      >
        Try again
      </button>
    </div>
  );
}

// app/dashboard/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>The dashboard item you requested does not exist.</p>
    </div>
  );
}
```

```tsx
// app/global-error.tsx (Root error boundary)
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went very wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

**Error Recovery Strategies:**
- **Transient errors** (network timeout): Offer "Try again" button
- **User errors** (invalid input): Show validation message, keep form data
- **Server errors** (500): Clear error context, reset to safe state
- **Auth errors** (401): Redirect to login

---

## 8. Monorepo Patterns (Shared Types & Utilities)

This is a monorepo with two apps: `apps/web` (Next.js) and `apps/api` (Express). Follow these patterns to avoid duplication and keep types synchronized.

### Shared Types Directory

- Create `apps/shared/types.ts` (or `types/index.ts` at workspace root) for types used across both apps.
- Import from shared location in both API and web app.

**Example shared types:**
```ts
// apps/shared/types.ts (or root level)
export interface SpaceDTO {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntryDTO {
  id: string;
  spaceId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

**In Next.js (web app):**
```tsx
// apps/web/lib/types.ts (or import from shared)
import { SpaceDTO, EntryDTO } from "@/lib/types"; // or "../shared/types"

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

**In Express API:**
```ts
// apps/api/src/types/index.ts
export { SpaceDTO, EntryDTO, UserDTO } from "@/shared/types"; // or import from shared
```

### Shared Utilities

- Extract common utility functions (date formatting, slugs, validation) into a shared folder or package.
- Example: `apps/shared/utils/` or create a workspace `packages/utils`.

**Example:**
```ts
// apps/shared/utils/date.ts
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  });
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return formatDate(date);
}
```

**Import in both apps:**
```tsx
// In Next.js
import { formatDate, getRelativeTime } from "@/lib/utils/date";

// In Express
import { formatDate } from "../shared/utils/date";
```

### API Contract Documentation

- Document API endpoints with request/response types using shared DTOs.
- Ensure API responses always use consistent shape.

**Example API Response Pattern:**
```ts
// API endpoint returns standardized response
export async function GET(request: Request) {
  try {
    const spaces = await fetchSpaces();
    return Response.json({
      success: true,
      data: spaces as SpaceDTO[],
    });
  } catch (error) {
    return Response.json(
      { success: false, error: "Failed to fetch spaces" },
      { status: 500 }
    );
  }
}
```

**Frontend consumes with type safety:**
```tsx
// apps/web/lib/api.ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function fetchSpaces(): Promise<SpaceDTO[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/spaces`);
  const json = await res.json() as ApiResponse<SpaceDTO[]>;
  
  if (!json.success || !json.data) {
    throw new Error(json.error || "Failed to fetch spaces");
  }
  return json.data;
}
```

---

## Quick Checklist

Before submitting code:
- [ ] No `any` types; strict TypeScript enforced
- [ ] Used path aliases (@/) for all imports
- [ ] File names in kebab-case, components in PascalCase
- [ ] Input validated with schema (Zod or similar)
- [ ] No hardcoded secrets; using `process.env`
- [ ] Images use `next/image` with `alt` and dimensions
- [ ] Server Components by default; `"use client"` only when needed
- [ ] Barrel files avoided for internal modules; used only for public APIs
- [ ] Semantic HTML with proper ARIA where needed
- [ ] Dynamic imports for non-critical large components
- [ ] **Data fetching strategy defined** (cache: 'no-store' vs revalidate vs tags)
- [ ] **Error boundaries placed** (error.tsx in key segments)
- [ ] **State management approach chosen** (Server Component vs useState vs TanStack Query)

