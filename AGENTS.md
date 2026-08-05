# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

This document helps agents understand the **Sylo** knowledge library application and guides their workflow.

## Project Overview

**Sylo** is an AI-powered knowledge library MVP that helps users compile knowledge into one searchable library and retrieve it via a chatbot powered by RAG (Retrieval-Augmented Generation).

### The WHAT

- **Frontend & Backend**: Next.js 16.2.4 (App Router)
- **Auth & Database**: Supabase (PostgreSQL + pgvector for embeddings)
- **AI System**: Vercel AI SDK with provider-agnostic LLM core (Google, Ollama)
- **Styling**: Tailwind CSS v4 (Standard)
- **Base Components**: shadcn/ui (Radix UI)
- **Interactive & Advanced UI**: Kokonut UI (Framer Motion)
- **Block Editor**: BlockNote (Markdown-in/out, `editable` toggle for view/edit)
- **Key Features**:
  - Document management with uppercase tagging, search, and navigation guard for unsaved changes
  - Unified Create/Edit/View mode via `DocumentManager` component
  - RAG-powered chatbot with vector similarity retrieval
  - Library-based RBAC system
  - Multi-provider LLM support

### The WHY

The application solves the problem of knowledge fragmentation by providing:

1. **Unified Knowledge Store**: Single source of truth for all knowledge
2. **Intelligent Retrieval**: RAG system provides accurate context to AI
3. **Multi-tenant Safety**: Library isolation with RLS policies
4. **Flexible AI**: Provider-agnostic LLM core allows switching between providers

### The HOW

**Build & Development**

```bash
npm install
npm run dev              # Start dev server on :3000
npm run build            # Production build
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run format           # Format src/**/*.{ts,tsx} with Prettier
npm run format:check     # Check formatting without writing
npm run test:e2e         # Run Playwright end-to-end tests
```

**Database**: Supabase CLI for migrations

```bash
supabase migration new <name>   # Create new migration
supabase db pull                # Sync schema changes
```

**End-to-End Testing**

- `playwright.config.ts` contains Playwright configuration.
- `tests/e2e` contains browser-based smoke tests for public auth and library flows.

**Key Non-Obvious Tools**

- Vercel AI SDK: Handles streaming responses and provider abstraction
- pgvector: PostgreSQL extension for vector similarity search
- Zod: Schema validation on all API inputs

---

## Architecture Overview

### 1. Data Ingestion Flow

1. User uploads documents via web interface → `src/app/api/documents/route.ts`
2. Documents stored in Supabase with metadata (tags, title, libraryId)
3. Document chunked and embedded → `src/lib/ai/chunking.ts` + `src/lib/ai/embeddings.ts`
4. Embeddings stored in pgvector column for similarity search

### 2. Retrieval Flow (RAG)

1. User query via `/api/chat/route.ts` with `libraryIds` array
2. Query embedding generated → `src/lib/ai/embeddings.ts`
3. Multi-library vector similarity search → `src/lib/ai/rag/retrieve.ts` (uses `match_document_chunks_multi` RPC)
4. Retrieved chunks used as context → `src/lib/ai/rag/context-builder.ts`
5. LLM streams response using context → `src/lib/ai/core/llm.ts`

### 3. RBAC & Library System

- 5 database models: User, Library, LibraryMember, Document, DocumentChunk
- 4 roles: VIEWER (0) < EDITOR (1) < ADMIN (2) < OWNER (3)
- RLS policies enforce row-level security at database layer
- Role checks at API layer via middleware
- See [library-system-implementation.md](/memories/repo/library-system-implementation.md) for details

---

## Critical Folders & Files

### Application Core

| Path                                                    | Purpose                                           |
| ------------------------------------------------------- | ------------------------------------------------- |
| `src/app/`                                              | Next.js routes & API handlers                     |
| `src/app/hub/`                                          | Main application hub (libraries, documents, chat) |
| `src/app/hub/_components/`                              | Feature-local components (documents, libraries)   |
| `src/app/hub/_components/documents/document-manager.tsx` | Unified Create/Edit/View document component       |
| `src/app/chat/page.tsx`                             | **Unified multi-library chat page**               |
| `src/app/chat/_components/chat-client.tsx`           | Interactive chat UI with library multi-select     |
| `src/app/hub/libraries/[id]/`                           | Library-specific routes (documents, settings)     |
| `src/app/hub/libraries/[id]/chat/page.tsx`              | Redirects to `/chat?libraryId=[id]`           |
| `src/app/api/`                                          | API route handlers                                |
| `src/app/api/chat/`                                     | RAG chat endpoint — accepts `libraryIds[]` array  |
| `src/app/api/documents/`                                | Document CRUD endpoints                           |
| `src/app/api/libraries/`                                | Library & member management                       |

### Shared Components

| Path                        | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| `src/components/ui/`        | shadcn/ui primitives                             |
| `src/components/kokonutui/` | Kokonut UI components (`ai-text-loading`, etc.)  |
| `src/components/layout/`    | App-wide layout components (Navbar, ThemeToggle) |
| `src/components/providers/` | React context providers (ThemeProvider)          |

### Libraries & Utilities

| Path                                  | Purpose                                                         |
| ------------------------------------- | --------------------------------------------------------------- |
| `src/lib/ai/`                         | LLM core, providers, RAG pipeline                               |
| `src/lib/ai/rag/pipeline.ts`          | Full RAG orchestration (query → embed → retrieve → stream)      |
| `src/lib/ai/rag/retrieve.ts`          | Multi-library retrieval using `match_document_chunks_multi` RPC |
| `src/lib/ai/core/llm.ts`              | Provider-agnostic LLM interface                                 |
| `src/lib/supabase/`                   | Supabase client (server/client modes)                           |
| `src/lib/actions/libraries.ts`        | Server actions for libraries (incl. `getUserLibraries`)         |
| `src/lib/hooks/`                      | Custom React hooks (e.g. `use-auth.ts`)         |
| `src/lib/hooks/use-navigation-guard.ts` | Prevents data loss with unsaved changes prompt                  |
| `src/lib/validation/`                 | Zod schemas for input validation                                |
| `src/lib/themes/`                     | Auth UI theming                                                 |
| `src/lib/utils.ts`                    | Utility functions (cn helper)                                   |

### Configuration & Testing

| Path                   | Purpose                      |
| ---------------------- | ---------------------------- |
| `components.json`      | shadcn/ui configuration      |
| `playwright.config.ts` | Playwright E2E configuration |
| `tests/e2e/`           | End-to-end browser tests     |
| `supabase/`            | Supabase config & migrations |
| `docs/`                | Project documentation        |

---

## Code Style & Formatting

- **Prettier** (`prettier`, `prettier-plugin-tailwindcss`) — enforces consistent formatting. Config in `.prettierrc`.
- **ESLint** (`eslint@^9`, `eslint-config-next`, `eslint-config-prettier`) — linting via flat config in `eslint.config.mjs`.
- `eslint-config-prettier` is included last to disable ESLint rules that conflict with Prettier.
- Always run `npm run format` then `npm run lint:fix` before committing.
- Remaining non-auto-fixable lint errors (e.g. `no-explicit-any`, `set-state-in-effect`) must be fixed manually in the affected files.

### File Naming Conventions

- **Files:** kebab-case (e.g., `chat-client.tsx`, `use-auth.ts`)
- **Components:** PascalCase (e.g., `ChatClient`)
- **Hooks:** camelCase in kebab-case files (e.g., `useAuth` in `use-auth.ts`)

---

## Instructions & Guidelines

All agents MUST follow the GitHub instructions referenced below. These are injected into every session:

- **[a11y.instructions.md](.github/instructions/a11y.instructions.md)** — WCAG 2.2 AA accessibility (38+ anti-patterns, CRITICAL rules)
- **[security-and-owasp.instructions.md](.github/instructions/security-and-owasp.instructions.md)** — OWASP Top 10 2025 (55+ anti-patterns, SQL injection, XSS, CSRF, auth failures)
- **[nextjs.instructions.md](.github/instructions/nextjs.instructions.md)** — Next.js 16+ App Router best practices
- **[nextjs-tailwind.instructions.md](.github/instructions/nextjs-tailwind.instructions.md)** — Tailwind + Shadcn conventions
- **[sql-sp-generation.instructions.md](.github/instructions/sql-sp-generation.instructions.md)** — SQL & stored procedure patterns

---

## Common Patterns

### API Route Pattern

Every API endpoint should follow this:

1. Authenticate user via Supabase
2. Extract and validate params/body with Zod
3. Check RBAC permissions
4. Call service layer
5. Return typed response (or error)

**Example:** `src/app/api/documents/route.ts`

### Frontend Fetch Pattern

1. On mount, fetch data from API with filters
2. Check user permissions and show PermissionDenied if needed
3. Show loading/error states
4. Render with proper accessibility (labels, roles, ARIA)

**Example:** `src/app/hub/libraries/[id]/documents/[docId]/page.tsx`

### RAG Chat Pattern

1. User submits query via chat UI
2. POST to `/api/chat` with message history
3. Stream chunks back to client
4. Display streamed response in real-time

**Example:** `src/app/api/chat/route.ts`

---

## UI Implementation Rules (shadcn/ui & Kokonut UI)

This project follows a "Registry-First" UI architecture. Agents must NOT write complex UI components or raw CSS animations from scratch if a library equivalent exists.

### 1. Component Discovery

- **Base Elements**: Use **shadcn/ui** for primitive components (Buttons, Inputs, Dialogs).
- **Advanced/Animated Elements**: Use **Kokonut UI** for Bento grids, Hero sections, and complex SaaS widgets.

### 2. Installation Protocol

Do not manually create files in `src/components/ui`. Use the respective CLIs to ensure all hooks and dependencies are wired correctly.

- **shadcn**: `npx shadcn@latest add <component-name>`
- **Kokonut UI**: `npx shadcn@latest add @kokonutui/<component-name>`

### 3. Technical Constraints

- **Animation**: Kokonut UI requires **Framer Motion**. Verify `framer-motion` is in `package.json` before implementation.
- **Styling**:
  - Use **Tailwind v4** conventions.
  - Always use the `cn()` utility (from `src/lib/utils.ts`) for conditional class merging.
  - Never write raw `.css` files; keep all styles within Tailwind classes.

---

## Security & Performance Checklist

**Before merging any code:**

- [ ] No hardcoded secrets (check `.env` rules in security instructions)
- [ ] Use shadcn/ui components for all form elements (`Input`, `Textarea`, `Select`, `Checkbox`, `Label`, etc.) instead of raw HTML elements
- [ ] Zod validation on all inputs
- [ ] RBAC check on sensitive endpoints
- [ ] RLS policy audit (for DB changes)
- [ ] Accessibility check (buttons labeled, color contrast, keyboard nav)
- [ ] SQL is parameterized (use Prisma or `$1` placeholders)
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] Error messages don't leak sensitive data

---

## Known Limitations & TODOs

1. **Real-time**: No live collaboration yet (future: Supabase Realtime)
2. **Versioning**: No document history (future: soft-delete + timestamps)
3. **Email-to-userId**: Not automated (manual for now)

---

## Sylo MVP application has the following hard limits to prevent abuse and ensure performance:

1. A user can have maximum of **5 owned libraries**
2. A user can be a member to a maximum of **5 shared libraries**
3. A library can have maximum of **500 documents**
4. A document can have a maximum of **1000 blocks**

---

## Getting Help

- **Supabase docs**: Reference via [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp) or web search for docs pages
- **Next.js docs**: Official [Next.js documentation](https://nextjs.org/docs)
- **Tailwind CSS docs**: Official [Tailwind documentation](https://tailwindcss.com/docs)
- **Shadcn UI docs**: [shadcn documentation](https://ui.shadcn.com/docs)
- **Kokonut UI docs**: [Kokonut UI documentation](https://kokonutui.com/docs)
- **Vercel AI SDK**: [SDK documentation](https://sdk.vercel.ai/)
- **GitHub Instructions**: See references above for WCAG, OWASP, and framework best practices
- **Finding new skills**: Use the `find-skills` skill — run `npx skills find [query]` or browse [skills.sh](https://skills.sh/) to discover and install additional agent skills
