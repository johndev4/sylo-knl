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
- **Base Components**: shadcn/ui (Radix Primitives)
- **Interactive & Advanced UI**: Kokonut UI
- **Key Features**:
  - Document management with tagging and search
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

1. User query via `/api/chat/route.ts`
2. Query embedding generated → `src/lib/ai/embeddings.ts`
3. Vector similarity search → `src/lib/ai/rag/retrieve.ts`
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

| Path                         | Purpose                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `src/app/`                   | Next.js routes & API handlers                              |
| `src/app/api/chat/`          | RAG chat endpoint (streaming)                              |
| `src/app/api/documents/`     | Document CRUD endpoints                                    |
| `src/app/api/libraries/`    | Library & member management                              |
| `src/lib/ai/`                | LLM core, providers, RAG pipeline                          |
| `src/lib/ai/rag/pipeline.ts` | Full RAG orchestration (query → embed → retrieve → stream) |
| `src/lib/ai/core/llm.ts`     | Provider-agnostic LLM interface                            |
| `src/lib/supabase/`          | Supabase client (server/client modes)                      |
| `src/lib/themes/`            | Auth UI theming                                            |
| `components/`                | Reusable React components                                  |
| `playwright.config.ts`       | Playwright E2E configuration                               |
| `tests/e2e/`                 | End-to-end browser tests                                   |

---

## Instructions & Guidelines

All agents MUST follow the GitHub instructions referenced below. These are injected into every session:

- **[a11y.instructions.md](.github/instructions/a11y.instructions.md)** — WCAG 2.2 AA accessibility (38+ anti-patterns, CRITICAL rules)
- **[security-and-owasp.instructions.md](.github/instructions/security-and-owasp.instructions.md)** — OWASP Top 10 2025 (55+ anti-patterns, SQL injection, XSS, CSRF, auth failures)
- **[nextjs.instructions.md](.github/instructions/nextjs.instructions.md)** — Next.js 16+ App Router best practices
- **[nextjs-tailwind.instructions.md](.github/instructions/nextjs-tailwind.instructions.md)** — Tailwind + Shadcn conventions
- **[nodejs-javascript-vitest.instructions.md](.github/instructions/nodejs-javascript-vitest.instructions.md)** — Node.js / JS best practices
- **[oop-design-patterns.instructions.md](.github/instructions/oop-design-patterns.instructions.md)** — OOP design patterns (Factory, Strategy, etc.)
- **[sql-sp-generation.instructions.md](.github/instructions/sql-sp-generation.instructions.md)** — SQL & stored procedure patterns

---

## Specialized Agent Roles

### 1. **RAG & LLM Engineer**

**Triggers**: Questions about embeddings, vector search, LLM providers, streaming responses, context building

**Responsibilities**:

- Implement embeddings pipeline (`src/lib/ai/embeddings.ts`)
- Add new LLM providers (`src/lib/ai/providers/`)
- Optimize retrieval strategy (`src/lib/ai/rag/retrieve.ts`)
- Debug streaming responses and chunk handling
- Monitor embedding quality and relevance

**Skills to Activate**: `supabase`, `supabase-postgres-best-practices`

**Key Files**:

- `src/lib/ai/core/llm.ts` — Provider interface
- `src/lib/ai/rag/pipeline.ts` — RAG orchestration
- `src/lib/ai/types/provider.types.ts` — Type definitions

---

### 2. **Backend & API Engineer**

**Triggers**: API routes, database queries, RBAC, validation, error handling, middleware

**Responsibilities**:

- Build/maintain REST API endpoints (`src/app/api/`)
- Implement role-based access control checks
- Write Zod validation schemas
- Handle Supabase auth and session management
- Enforce business constraints (max libraries, document limits)

**Skills to Activate**: `supabase`

**Key Files**:

- `src/app/api/` — All route handlers
- `src/lib/rbac.ts` — Permission checking
- `src/lib/validation/` — Zod schemas
- Search `.github/instructions/security-and-owasp.instructions.md` for API anti-patterns

---

### 3. **Frontend & React Engineer**

**Triggers**: UI components, state management, client pages, user interactions, styling

**Responsibilities**:

- Build React components and pages (`src/components/`, `src/app/hub/`)
- Integrate Supabase Auth UI
- Manage form state and validation
- Implement search/filter/pagination UI
- Ensure accessibility (WCAG 2.2 AA)

**Skills to Activate**: None specific (follow instructions)

**Key Files**:

- `src/components/` — Reusable UI components
- `src/app/(auth)/` — Auth flow pages
- `src/app/hub/` — Library chat pages

---

### 4. **Database & Security Engineer**

**Triggers**: Schema design, migrations, RLS policies, performance, vector indexing, security

**Responsibilities**:

- Design database schema and relationships
- Write PostgreSQL migrations via Supabase CLI
- Implement and audit RLS policies
- Create indexes for performance
- Validate against OWASP Top 10 (A04 Cryptographic Failures, A05 Injection)

**Skills to Activate**: `supabase`, `supabase-postgres-best-practices`

**Key Files**:

- `supabase/config.toml` — Supabase configuration
- `supabase/migrations/` — Migration SQL files
- `prisma/schema.prisma` — ORM schema (reference only)

---

### 5. **DevOps & Deployment Engineer**

**Triggers**: Build process, deployment, environment variables, CI/CD, production readiness

**Responsibilities**:

- Manage environment configuration
- Ensure secrets are not committed
- Verify build and start scripts work
- Monitor for NEXT*PUBLIC* leaks
- Test production builds

**Skills to Activate**: None specific

**Key Files**:

- `.env.example` — Example environment variables
- `next.config.ts` — Next.js build configuration
- `package.json` — Build/start commands

---

## Common Patterns

### API Route Pattern

Every API endpoint should follow this:

1. Authenticate user via Supabase
2. Extract and validate params/body with Zod
3. Check RBAC permissions
4. Call service layer
5. Return typed response (or error)

See `src/app/api/documents/route.ts` for reference.

### Frontend Fetch Pattern

1. On mount, fetch data from API with filters
2. Check user permissions and show PermissionDenied if needed
3. Show loading/error states
4. Render with proper accessibility (labels, roles, ARIA)

See `src/app/hub/[id]/documents/page.tsx` for reference.

### RAG Chat Pattern

1. User submits query via chat UI
2. POST to `/api/chat` with message history
3. Stream chunks back to client
4. Display streamed response in real-time

See `src/app/api/chat/route.ts` for reference.

---

## UI Implementation Rules (shadcn/ui & Kokonut UI)

This project follows a "Registry-First" UI architecture. Agents must NOT write complex UI components or raw CSS animations from scratch if a library equivalent exists.

### 1. Component Discovery

- **Base Elements**: Use **shadcn/ui** for primitive components (Buttons, Inputs, Dialogs).
- **Advanced/Animated Elements**: Use **Kokonut UI** for Bento grids, Hero sections, and complex SaaS widgets.

### 2. Installation Protocol

Do not manually create files in `src/components/ui`. Use the respective CLIs to ensure all hooks and dependencies are wired correctly.

- **shadcn**: `npx shadcn@latest add <component-name>`
- **Kokonut UI**: `npx shadcn@latest add https://kokonutui.com/<component-name>.json`

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
- [ ] Zod validation on all inputs
- [ ] RBAC check on sensitive endpoints
- [ ] RLS policy audit (for DB changes)
- [ ] Accessibility check (buttons labeled, color contrast, keyboard nav)
- [ ] SQL is parameterized (use Prisma or `$1` placeholders)
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] Error messages don't leak sensitive data

---

## Known Limitations & TODOs

1. **Auto-save**: Currently manual Save button (future: auto-save on delay)
2. **Real-time**: No live collaboration yet (future: Supabase Realtime)
3. **Versioning**: No document history (future: soft-delete + timestamps)
4. **Email-to-userId**: Not automated (manual for now)

---

## Getting Help

- **Supabase docs**: Reference via [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp) or web search for docs pages
- **Next.js docs**: Official [Next.js documentation](https://nextjs.org/docs)
- **Vercel AI SDK**: [SDK documentation](https://sdk.vercel.ai/)
- **GitHub Instructions**: See references above for WCAG, OWASP, and framework best practices

---

**Last Updated**: April 2026  
**Maintained By**: juanlinuz
**Status**: Production-Ready MVP (in active development)
