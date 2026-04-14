---
description: "Generate an execution-ready MVP implementation plan from a PRD, including architecture, schema, APIs, and delivery phases"
name: "Generate MVP From PRD"
argument-hint: "prd_path, depth (plan|starter|full-mvp), and stack preferences"
agent: "agent"
---
Create an implementation-ready MVP blueprint from a PRD.

## Inputs
- `prd_path` (optional): Path to the PRD file. Default: [docs/product-requirements-document.md](../../docs/product-requirements-document.md)
- `depth` (optional): `plan` | `starter` | `full-mvp` (default: `starter`)
- `stack_preferences` (optional): frontend/backend/database/ORM/auth/deployment preferences
- `constraints` (optional): budget, timeline, team size, must-have features, excluded features

## Task
1. Read the PRD and extract goals, user personas, core features, scope limits, and success metrics.
2. Convert requirements into:
   - prioritized feature backlog (`must`, `should`, `later`)
   - architecture decisions with trade-offs
   - data model and SQL schema
   - API contract
   - frontend page/component map
   - AI integration contract
3. Produce a delivery plan with milestones, dependencies, and risk controls.
4. Align every recommendation to MVP scope; avoid over-engineering.
5. If requirements are ambiguous, list assumptions clearly before implementation details.

## Output Format
Return sections in this exact order:
1. Scope Snapshot
2. Architecture Decisions
3. Database Schema (SQL)
4. API Design
5. Frontend Structure
6. AI Integration Flow
7. Delivery Plan (Week-by-Week)
8. Risks and Mitigations
9. Open Questions

## Quality Rules
- Be concrete and implementation-oriented.
- Prefer production-safe defaults.
- Include indexing, validation, and error-handling considerations.
- Keep language concise and actionable.
- Do not include pseudo-code when `depth` is `full-mvp`; provide runnable code snippets where needed.
