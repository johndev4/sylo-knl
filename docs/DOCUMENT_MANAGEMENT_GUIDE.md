# Document Management Guide

## Overview

Sylo's document management system provides a **unified, BlockNote-powered interface** for creating, editing, and viewing Markdown documents within a library. A single `DocumentManager` component handles all three modes, using BlockNote's `editable` toggle to switch between view and edit states — eliminating the need for separate routes.

---

## ✅ What Is Implemented

### 1. Database

- ✅ `author_ids` UUID array on `documents` tracks all contributors.
- ✅ `deleted_at` TIMESTAMPTZ for soft deletions (safe delete).
- ✅ `document_edits` table for full audit logging.
- ✅ `preferences` JSONB column on `users` table for per-user settings (e.g. auto-save).
- ✅ `match_document_chunks` RPC ignores soft-deleted documents.

### 2. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/documents?libraryId=...` | List documents (paginated, searchable, tag-filterable) |
| `POST` | `/api/documents` | Create document, generate embeddings, log action |
| `GET` | `/api/documents/[docId]` | Fetch single document |
| `PUT` | `/api/documents/[docId]` | Update document with OCC, re-embed if content changed |
| `DELETE` | `/api/documents/[docId]` | Soft delete + audit log |
| `DELETE` | `/api/documents/[docId]` | Soft delete + audit log |

### 3. Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| `DocumentManager` | `src/app/hub/_components/documents/DocumentManager.tsx` | **Unified** Create/Edit/View component |
| `Editor` | `src/app/hub/_components/documents/block_editor/Editor.tsx` | BlockNote editor (Markdown in/out, editable toggle) |
| `DocumentsSidebar` | `src/app/hub/_components/documents/DocumentsSidebar.tsx` | Library sidebar with lazy-loading doc list |
| `SidebarRefreshContext` | `src/app/hub/_components/documents/SidebarRefreshContext.tsx` | Context to trigger sidebar re-fetch after saves |
| `useNavigationGuard` | `src/lib/hooks/useNavigationGuard.ts` | Prevents data loss with unsaved changes prompt |

### 4. Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/hub/libraries/[id]/documents` | (layout) | Empty state with sidebar |
| `/hub/libraries/[id]/documents/new` | `DocumentManager` (isNew=true) | Create new document |
| `/hub/libraries/[id]/documents/[docId]` | `DocumentManager` | View/Edit document (mode toggled in UI) |

> **Note:** The `/documents/[docId]/edit` route has been **deleted**. All editing is handled inline via the Edit Mode toggle in the `DocumentManager` header.

---

## 🗂️ Files Created & Modified

```
✅ Components
   src/app/hub/_components/documents/DocumentManager.tsx     (new)
   src/app/hub/_components/documents/DocumentsSidebar.tsx    (updated)
   src/app/hub/_components/documents/block_editor/Editor.tsx (updated)

✅ Pages
   src/app/hub/libraries/[id]/documents/new/page.tsx         (updated → uses DocumentManager)
   src/app/hub/libraries/[id]/documents/[docId]/page.tsx     (updated → uses DocumentManager)
   src/app/hub/libraries/[id]/documents/[docId]/edit/        (deleted)

✅ Hooks
   src/lib/hooks/useNavigationGuard.ts                       (new)

✅ Database Migrations
   supabase/migrations/20260504000000_add_user_preferences.sql

✅ Tests
   tests/e2e/documents.spec.ts                               (updated)
```

---

## 🔑 Key Features

### Unified Edit/View Mode

The `DocumentManager` component renders a single layout for both viewing and editing. The header includes:

- **Title** — always an `<input>` (disabled in view mode, shows full title on hover)
- **Date Created / Modified** — shown in metadata bar
- **Authors** — shown if document exists and has author data
- **Edit Mode Toggle** — visible only when `!isNew` (existing documents)
- **Save Button** — visible only in edit/create mode
- **Delete Button** — visible for existing documents when the user has `EDITOR`, `ADMIN`, or `OWNER` role. Uses a red `Trash2` icon and prompts for confirmation via an `AlertDialog`.
- **Tags** — always shown in **UPPERCASE**; remove buttons appear only in edit mode
- **State Reset** — uses `key={docId}` or `key="new"` to force component re-initialization when switching documents.
- **New Draft Reset** — on `/hub/libraries/[id]/documents/new`, clicking sidebar `+` while already on the new-document page requests a fresh draft reset (title, tags, editor content).

### Document Deletion (Soft Delete)

Users with sufficient permissions can delete documents from the `DocumentManager` header. 
- **Confirmation**: A shadcn `AlertDialog` prevents accidental deletions.
- **Backend**: The `DELETE /api/documents/[docId]` endpoint performs a soft delete by setting `deleted_at`.
- **Redirection**: Upon successful deletion, the user is redirected back to the library's document list, and the sidebar is refreshed.
- **RBAC**: Viewers cannot see the delete button and are blocked by the API.

### Navigation Guard

The `useNavigationGuard` hook prevents accidental data loss by prompting the user if they attempt to leave the page with unsaved changes. This guard is active in both "Create" and "Edit" modes and covers:

- **Browser Close/Refresh** — triggers a standard browser confirmation dialog (`beforeunload`).
- **Internal Navigation** — intercepts clicks on internal links (e.g., sidebar documents, "New Document" button) and shows a `window.confirm` dialog.
- **Tab/Exit** — prevents closing the browser window without confirmation if changes exist.
- **Same-page New Draft Action** — clicking sidebar `+` on `/documents/new` prompts to discard unsaved changes before clearing draft fields.

Unsaved changes are detected by comparing the current state (title, content, tags) against the initial data loaded from the server.

### MVP Limits Enforcement

| Limit | Enforcement |
|-------|-------------|
| Max 500 documents/library | Sidebar disables the "New Document" button when total ≥ 500 |
| Max 1000 blocks/document | Editor counts blocks in real-time; shows warning and disables Save |
| Max 60 characters/title | Title input is limited to 60 characters via `maxLength` |

### Sidebar: Lazy Loading & Tag Filter

- Documents are fetched in pages of **100** via `?limit=100&page=N`.
- A "Load More" button appends the next page when `totalDocs > documents.length`.
- Tags are filtered via a **Select dropdown** (not chips), preventing sidebar overflow when many tags are present.
- Search, tag filter, and library name are pinned in a **fixed header area**; the document list scrolls independently.
- **Long Title Handling**: Titles are truncated with an ellipsis (`truncate`) and show the full title via a premium **Tooltip** on hover.

### Conflict Prevention (OCC)

The PUT endpoint validates `lastUpdatedAt`. If another user has saved the document since the client loaded it, the API returns `409 Conflict`.

---

## 🧪 Testing Guide

```bash
npm run test:e2e               # Run all Playwright tests
npx playwright show-report     # View last HTML report
```

### Test Coverage

| Test | Description |
|------|-------------|
| List documents & filters | Sidebar shows docs, search input works, tag dropdown visible |
| Create with all fields | Title + BlockNote content + tag → Save button click |
| Create without tags | Minimal required fields only |
| View document details | Title input shows in disabled state, Edit Mode button visible, Save hidden |
| Switch to edit mode | Toggle edit mode → title editable → Save button → click |
| Unsaved changes prompt | Typing → try to click sidebar link → confirmation dialog |
| New draft reset (cancel) | Dirty `/documents/new` + sidebar `+` + cancel prompt → draft stays intact |
| New draft reset (confirm) | Dirty `/documents/new` + sidebar `+` + confirm prompt → title/tags/content reset |
| New draft reset (clean) | Clean `/documents/new` + sidebar `+` → reset happens without prompt |

### Manual Testing Tips

1. **Conflict prevention**: Open the same document in two tabs. Edit and save in Tab 1. Then try saving in Tab 2 — expect a 409 conflict error.
2. **Limit enforcement**: Create 500 documents in a library and confirm the "+" button in the sidebar is disabled.
3. **Block limit**: Paste 1000+ blocks into the editor and confirm the warning appears and Save is disabled.

---

**Last Updated**: May 4, 2026
**Status**: ✅ Active
**Framework**: Next.js 16.2.4 + Supabase + BlockNote + Playwright
