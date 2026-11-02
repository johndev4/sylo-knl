<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

This document helps agents understand the **Sylo** knowledge library application and guides their workflow.

## Project Overview

**Sylo** is an AI-powered knowledge library for building searchable knowledge bases and retrieving information through an intelligent chat interface. It is built with Next.js App Router, Supabase auth/database, and a RAG retrieval pipeline using vector search.

### Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Auth & Database**: Supabase (PostgreSQL + pgvector for embeddings)
- **AI System**: Vercel AI SDK with provider-agnostic LLM core (Google, Ollama)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (primitives), Kokonut UI (Framer Motion animations)
- **Block Editor**: BlockNote (Markdown-in/out, `editable` toggle for view/edit)
- **Validation**: Zod schemas for API inputs & responses

### Development Commands

```bash
pnpm dev              # Start dev server on :3000
pnpm build            # Production build
pnpm lint             # Run ESLint
pnpm lint:fix         # Run ESLint with auto-fix
pnpm format           # Format src/**/*.{ts,tsx} with Prettier
pnpm format:check     # Check formatting without writing
pnpm test:e2e         # Run Playwright end-to-end tests
```

**Database Migrations (Supabase CLI)**:

```bash
supabase migration new <name>   # Create new migration
supabase db pull                # Sync schema changes
```

---

## Architecture Overview

### 1. Data Ingestion Flow

1. User uploads/saves documents via web interface → `src/features/library/document/actions.ts`
2. Documents stored in Supabase with metadata (tags, title, libraryId)
3. Document chunked and embedded → `src/lib/ai/chunking.ts` + `src/lib/ai/embeddings.ts`
4. Embeddings stored in pgvector column for similarity search

### 2. Retrieval Flow (RAG)

1. User submits query via chat UI → POST to `/api/chat/route.ts` with `libraryIds` array
2. Query embedding generated → `src/lib/ai/embeddings.ts`
3. Multi-library vector similarity search → `src/lib/ai/rag/retrieve.ts` (uses `match_document_chunks_multi` RPC)
4. Retrieved chunks used as context → `src/lib/ai/rag/context-builder.ts`
5. LLM streams response using context → `src/lib/ai/core/llm.ts`

### 3. RBAC & Library System

- Database models: User, Library, LibraryMember, Document, DocumentChunk
- Roles: `VIEWER (0)` < `EDITOR (1)` < `ADMIN (2)` < `OWNER (3)`
- RLS policies enforce row-level security at database layer
- Role checks enforced at server action and API layers

---

## Project Structure

```
sylo-knl/
│
├── src/
│   ├── app/                              → App Router (pages, layouts) & API routes
│   │   ├── (auth)/                       → Authentication App routes
│   │   ├── (protected)/                  → Authenticated App routes
│   │   └── api/                          → API routes (e.g. chat/route.ts)
│   │
│   ├── components/                       → Reusable UI components (primitives, layout)
│   │   ├── ui/                           → shadcn/ui primitives (Base UI)
│   │   ├── kokonutui/                    → Kokonut UI components
│   │   ├── layout/                       → App-wide layout components
│   │   ├── providers/                    → React context providers
│   │   └── shared/                       → Shared non-feature UI components
│   │
│   ├── features/                         → Feature-based application modules
│   │   ├── auth/                         → Login, Register, Auth logic
│   │   ├── user/                         → User-related logic
│   │   ├── chat/                         → RAG chatbot and chat UI
│   │   ├── hub/                          → Library hub and overview logic
│   │   └── library/                      → Library management logic
│   │       ├── document/                 → Document management sub-feature
│   │       ├── invite/                   → Library invitation sub-feature
│   │       ├── components/               → Library UI components
│   │       ├── actions.ts                → Server actions (data mutations)
│   │       └── queries.ts                → Data fetching queries
│   │
│   ├── hooks/                            → App-wide custom React hooks
│   ├── styles/                           → Third-party CSS overrides
│   └── lib/                              → Utilities and configurations
│       ├── ai/                           → LLM core, providers, RAG pipeline
│       ├── auth/                         → Auth helpers and callbacks
│       ├── supabase/                     → Supabase client helpers
│       ├── themes/                       → Custom UI theming
│       └── utils.ts                      → Utility functions (cn, etc.)
│
├── components.json                       → shadcn/ui configuration
├── playwright.config.ts                  → Playwright E2E configuration
├── tests/
│   └── e2e/                              → End-to-end browser tests
├── supabase/                             → Supabase config & migrations
└── docs/                                 → Project documentation
```

### Feature Module Conventions (`src/features/[feature_name]`)

When creating or modifying features, enforce this standard directory structure:

- **`actions.ts`**: Server actions for data mutations (`"use server"`).
- **`queries.ts`**: Data fetching logic and Supabase queries.
- **`[feature]-schema.ts`**: Zod validation schemas for forms and payloads.
- **`components/`**: Feature-specific UI components (not shared globally).
- **`hooks/`**: Feature-scoped custom React hooks (optional).

### Architectural Placement Rules

1. **Thin App Router Routes (`src/app`)**: Route `page.tsx` files should strictly handle route params, page titles, and render top-level feature components.
2. **Domain Isolation (`src/features`)**: Place all feature-specific logic, schemas, and UI components inside `src/features/[name]`.
3. **Global Primitives (`src/components`)**: Only place generic, reusable UI components (e.g. buttons, dialogs, navbars) in `src/components`.

---

## Code Style & Formatting

- **Prettier** (`prettier`, `prettier-plugin-tailwindcss`) — enforces consistent formatting. Config in `.prettierrc`.
- **ESLint** (`eslint@^9`, `eslint-config-next`, `eslint-config-prettier`) — linting via flat config in `eslint.config.mjs`.
- Always run `pnpm format` then `pnpm lint:fix` before committing.
- Non-auto-fixable lint errors must be fixed manually in affected files.

### Naming Conventions

- **Files:** kebab-case (e.g., `chat-client.tsx`, `use-auth.ts`)
- **Components:** PascalCase (e.g., `ChatClient`)
- **Hooks:** camelCase in kebab-case files (e.g., `useAuth` in `use-auth.ts`)

---

## Common Patterns

### API Route Pattern

1. Authenticate user via Supabase
2. Extract and validate params/body with Zod
3. Check RBAC permissions
4. Call service layer
5. Return typed JSON response (or error)

### Frontend Fetch Pattern

1. Import query functions from feature-specific modules (`queries.ts`)
2. Call query functions from client components (or server components where appropriate)
3. Check user permissions and render permission guards if needed
4. Handle loading/error states explicitly
5. Render accessible UI (ARIA attributes, semantic elements)

---

## UI Implementation Rules (shadcn/ui & Kokonut UI)

This project follows a "Registry-First" UI architecture. Do NOT write complex UI components or raw CSS animations from scratch if a library equivalent exists.

### 1. Component Discovery

- **Base Elements**: Use **shadcn/ui** for primitives (Buttons, Inputs, Dialogs).
- **Advanced/Animated Elements**: Use **Kokonut UI** for Bento grids, Hero sections, and complex SaaS widgets.

### 2. Installation Protocol

Do not manually create files in `src/components/ui`. Use CLIs to ensure hooks and dependencies are properly configured:

- **shadcn**: `npx shadcn@latest add <component-name>`
- **Kokonut UI**: `npx shadcn@latest add @kokonutui/<component-name>`

### 3. Technical Constraints

- **Animation**: Kokonut UI requires **Framer Motion** (`framer-motion` in `package.json`).
- **Styling**:
  - Use **Tailwind v4** conventions.
  - Always use `cn()` from `src/lib/utils.ts` for conditional class merging.
  - Never write raw `.css` files; keep all styles within Tailwind classes.

---

## Security & Performance Checklist

**Before merging any code:**

- [ ] No hardcoded secrets (verify `.env` usage)
- [ ] Use shadcn/ui components for all form elements (`Input`, `Textarea`, `Select`, `Checkbox`, `Label`) instead of raw HTML elements
- [ ] Zod validation on all API inputs and mutations
- [ ] RBAC check on sensitive endpoints and server actions
- [ ] RLS policy audit for database queries
- [ ] Accessibility check (buttons labeled, color contrast, keyboard navigation)
- [ ] SQL queries parameterized (or via Supabase SDK)
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] Error messages do not leak internal stack traces or sensitive data

---

## Application Limits (MVP)

1. Maximum of **5 owned libraries** per user
2. Maximum of **5 shared libraries** per user
3. Maximum of **500 documents** per library
4. Maximum of **1000 blocks** per document
