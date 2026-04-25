# Library Member Management - Architecture & Implementation Details

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           Library Settings Page                           │  │
│  │         (/librarys/[id]/settings/page.tsx)                   │  │
│  │                                                              │  │
│  │  ┌─────────────────┐  ┌──────────────────────────────────┐ │  │
│  │  │ AddMemberForm   │  │    MemberTable                   │ │  │
│  │  │                 │  │  - List all members              │ │  │
│  │  │ • Email input   │  │  - Edit roles (inline)           │ │  │
│  │  │ • Role select   │  │  - Bulk select & delete          │ │  │
│  │  │ • Submit button │  │  - Individual remove             │ │  │
│  │  └─────────────────┘  └──────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ (fetch/POST/PATCH/DELETE)
┌─────────────────────────────────────────────────────────────────────┐
│                       Server Actions Layer                           │
│              (src/lib/actions/librarys.ts)                         │
│                                                                       │
│  • fetchLibraryMembers(libraryId)                               │
│  • addLibraryMember(libraryId, email, role)                     │
│  • updateLibraryMemberRole(libraryId, userId, role)             │
│  • removeLibraryMember(libraryId, userId)                       │
│  • removeMultipleLibraryMembers(libraryId, userIds[])           │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ (HTTP API calls)
┌─────────────────────────────────────────────────────────────────────┐
│                        API Routes Layer                              │
│                   (src/app/api/librarys/...)                       │
│                                                                       │
│  GET    /api/librarys/[id]/members                                │
│         ├─ Auth check (user must exist)                             │
│         ├─ Permission check (member of library)                   │
│         └─ Return: Array of member objects                          │
│                                                                       │
│  POST   /api/librarys/[id]/members                                │
│         ├─ Auth check                                               │
│         ├─ Permission check (OWNER or ADMIN)                        │
│         ├─ Validate input (Zod schema)                              │
│         ├─ Check member limit (max 11)                              │
│         └─ Insert member to database                                │
│                                                                       │
│  PATCH  /api/librarys/[id]/members/[userId]                      │
│         ├─ Auth check                                               │
│         ├─ Permission check (OWNER or ADMIN)                        │
│         ├─ Validate input (Zod schema)                              │
│         ├─ Check business rules                                     │
│         └─ Update member role                                       │
│                                                                       │
│  DELETE /api/librarys/[id]/members/[userId]                      │
│         ├─ Auth check                                               │
│         ├─ Permission check (OWNER or ADMIN)                        │
│         ├─ Check if not removing only OWNER                         │
│         └─ Delete member from database                              │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ (Supabase SDK)
┌─────────────────────────────────────────────────────────────────────┐
│                    Database Layer (PostgreSQL)                       │
│                                                                       │
│  Table: library_members                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ library_id (uuid)  │ user_id (uuid)  │ role (enum)         │  │
│  │ created_at (timestamp)                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  RLS Policies:                                                       │
│  ├─ SELECT: User is member of library                             │
│  ├─ INSERT: Owner/Admin adding OR user adding self                  │
│  ├─ UPDATE: Owner/Admin only                                        │
│  └─ DELETE: Owner/Admin only                                        │
│                                                                       │
│  Triggers:                                                           │
│  └─ MAX 11 MEMBERS per library                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Examples

### Adding a New Member

```
1. User fills form: email="user@example.com", role="EDITOR"
   ↓
2. AddMemberForm validates email format (Zod)
   ↓
3. Form calls: addLibraryMember(libraryId, email, role)
   ↓
4. POST /api/librarys/[id]/members
   {
     "email": "user@example.com",
     "role": "EDITOR"
   }
   ↓
5. API Handler:
   a) Get current user from Supabase auth
   b) Check if user is member of library → 403 if not
   c) Check if user is OWNER or ADMIN → 403 if not
   d) Validate input with Zod schema
   e) Find user by email in users table
   f) Check if already member → 409 if duplicate
   g) Check member count < 11 → 409 if full
   h) INSERT into library_members
   i) Return member object with user details
   ↓
6. MemberTable re-fetches members via fetchLibraryMembers()
   ↓
7. UI updates with new member in table
```

### Updating Member Role

```
1. User selects new role from dropdown
   ↓
2. Calls: updateLibraryMemberRole(libraryId, userId, newRole)
   ↓
3. PATCH /api/librarys/[id]/members/[userId]
   {
     "role": "ADMIN"
   }
   ↓
4. API Handler:
   a) Get current user from Supabase auth
   b) Check if user is OWNER or ADMIN → 403 if not
   c) Validate new role (not OWNER)
   d) Check target member exists → 404 if not
   e) Check cannot demote only OWNER
   f) UPDATE member role
   g) Return updated member object
   ↓
5. MemberTable updates row in UI
```

### Removing a Member

```
1. User clicks "Remove" button
   ↓
2. Confirmation dialog appears
   ↓
3. User confirms deletion
   ↓
4. Calls: removeLibraryMember(libraryId, userId)
   ↓
5. DELETE /api/librarys/[id]/members/[userId]
   ↓
6. API Handler:
   a) Get current user from Supabase auth
   b) Check if user is OWNER or ADMIN → 403 if not
   c) Check target member exists → 404 if not
   d) Check cannot remove only OWNER
   e) DELETE from library_members
   f) Return success
   ↓
7. MemberTable removes row from UI
```

---

## Data Models

### LibraryMember (API Response)
```typescript
interface LibraryMember {
  library_id: string;      // UUID of library
  user_id: string;           // UUID of user
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  created_at: string;        // ISO datetime
  user: {
    id: string;              // UUID
    name: string | null;     // User's full name
    email: string;           // User's email
    avatar_url: string | null;  // Avatar URL
  };
}
```

### Add Member Input (Zod)
```typescript
interface AddLibraryMemberInput {
  email: string;  // Must be valid email and user must exist
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';  // Cannot be OWNER
}
```

### Update Role Input (Zod)
```typescript
interface UpdateLibraryMemberRoleInput {
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';  // Cannot be OWNER
}
```

---

## Permission Matrix

### Who Can Perform What Actions

```
                ADD    UPDATE   REMOVE
OWNER           ✅     ✅       ✅ (except self if only owner)
ADMIN           ✅     ✅       ✅ (except owner)
EDITOR          ❌     ❌       ❌
VIEWER          ❌     ❌       ❌
```

### Role Transition Rules

```
FROM OWNER:
  ↓ TO ADMIN       ❌ Cannot demote if only owner
  ↓ TO EDITOR      ❌ Cannot demote if only owner
  ↓ TO VIEWER      ❌ Cannot demote if only owner

FROM ADMIN:
  ↑ TO OWNER       ❌ Cannot promote
  ↓ TO EDITOR      ✅
  ↓ TO VIEWER      ✅

FROM EDITOR:
  ↑ TO OWNER       ❌ Cannot promote
  ↑ TO ADMIN       ✅
  ↓ TO VIEWER      ✅

FROM VIEWER:
  ↑ TO OWNER       ❌ Cannot promote
  ↑ TO ADMIN       ✅
  ↑ TO EDITOR      ✅
```

---

## Error Handling

### HTTP Status Codes

```
200 OK                    ✅ Success
201 Created               ✅ Member added successfully
400 Bad Request           ❌ Validation failed (invalid email, etc.)
401 Unauthorized          ❌ Not authenticated
403 Forbidden             ❌ Permission denied (not admin, etc.)
404 Not Found             ❌ Library or member not found
409 Conflict              ❌ Business rule violation
  - User already member
  - Library is full (11/11)
  - Cannot remove only owner
  - Cannot promote to owner
500 Internal Server Error ❌ Unexpected error
```

### Error Response Format
```json
{
  "error": "Human-readable error message"
}
```

---

## Security Layers

### Layer 1: Authentication
- Checks user is logged in via Supabase auth
- Returns 401 if not authenticated

### Layer 2: Authorization (API Level)
- Checks if user is member of library
- Checks if user has correct role (OWNER/ADMIN for management)
- Returns 403 if unauthorized

### Layer 3: Validation (Input Level)
- Zod schemas validate all input data
- Email format validation
- Role enum validation
- Returns 400 if invalid

### Layer 4: Business Logic
- Checks member already exists
- Checks library member limit
- Checks cannot remove only owner
- Checks cannot promote to owner
- Returns 409 if business rule violated

### Layer 5: Database Level
- Row Level Security (RLS) policies
- Database constraints
- Database triggers
- Ensures even direct SQL queries are restricted

---

## Component Tree

```
LibrarySettingsPage (page.tsx)
├── Header with Back button
├── Error/Success messages
├── AddMemberForm
│   ├── Email input
│   ├── Role dropdown
│   └── Submit button
├── MemberTable
│   ├── Select all checkbox
│   ├── TableRows (for each member)
│   │   ├── Checkbox
│   │   ├── Avatar & Name
│   │   ├── Email
│   │   ├── Role dropdown
│   │   ├── Joined date
│   │   └── Remove button
│   └── Bulk delete button
└── Library Information
    ├── Library ID
    ├── Your Role
    └── Member Limit
```

---

## Performance Considerations

### Current Implementation
- Fetches all members at once (OK for ≤11 members)
- No pagination needed (max 11 members)
- Simple database queries without complex joins
- RLS policies evaluated per request

### Future Optimizations
- Add caching for member list (stale-while-revalidate)
- Batch API requests for multiple operations
- Optimistic UI updates before confirmation
- Real-time updates via Supabase Realtime

---

## Testing Coverage Checklist

```
✅ Add member with valid email
✅ Add member with invalid email
✅ Add duplicate member (already exists)
✅ Add to full library (11/11)
✅ Update member role
✅ Prevent demoting only owner
✅ Prevent promoting to owner
✅ Remove individual member
✅ Remove multiple members
✅ Permission check for EDITOR/VIEWER
✅ Cannot manage members without permission
✅ Member with same email, different casing
✅ Non-existent user email
```

---

## Deployment Checklist

```
✅ Database migration applied
✅ RLS policies activated
✅ API routes tested
✅ Components tested in browser
✅ Permission checks working
✅ Error messages user-friendly
✅ No console errors
✅ Accessibility validated (WCAG 2.2 AA)
✅ Security reviewed (OWASP)
✅ Environment variables set
✅ HTTPS enabled (production)
✅ Rate limiting configured (optional)
```

---

## Related Files Reference

| File | Purpose |
|------|---------|
| `library.schema.ts` | Zod validation schemas |
| `library.service.ts` | Business logic services |
| `rbac.ts` | Role-based access control |
| `supabase/server.ts` | Supabase server client |
| `supabase/client.ts` | Supabase browser client |

---

**Last Updated**: April 20, 2026  
**Author**: Implementation Team  
**Status**: Production Ready
