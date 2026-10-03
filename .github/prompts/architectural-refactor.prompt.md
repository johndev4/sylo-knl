# Architectural Refactor Template

## Goal
[High-level objective: What is being changed and why?]

## Context: [Data Flow / System Architecture]
[Provide a diagram (Mermaid/ASCII) or structured text describing the "Before" and "After" states. Explicitly define the Single Source of Truth and any transient/cached states.]

## What the [New/Refactored] [System/Component] does
- [Key behavior change 1]
- [Key behavior change 2]
- [Constraint: e.g., "Do not store X in the database"]

## Tasks

### 1. Analyze Current Codebase
- [ ] [Task: Identify current implementation/data flow]
- [ ] [Task: List relevant database schemas/API endpoints]
- [ ] [Task: Identify entry points and dependencies]

### 2. Design Migration Plan
- [ ] [Task: Document breaking changes]
- [ ] [Task: Create a step-by-step refactor sequence]
- [ ] [Task: Identify parallelizable tasks]
- [ ] [Task: Flag legacy blockers or data migration needs]
- [ ] [Task: Estimate effort per phase]

### 3. Refactor Execution Plan
- [ ] **Phase 1: [Name]**
  - [ ] [Action item]
  - [ ] [Action item]
- [ ] **Phase 2: [Name]**
  - [ ] [Action item]
  - [ ] [Action item]
- [ ] **Phase 3: [Name]**
  - [ ] [Action item]
  - [ ] [Action item]

### 4. Testing & Validation
- [ ] [Task: Unit tests for new logic/converters]
- [ ] [Task: End-to-end verification of the new flow]
- [ ] [Task: Performance/Quality benchmarking]
- [ ] [Task: Data integrity check (no loss)]

## Success Criteria
- [ ] [Criterion 1: e.g., Only X is stored in DB]
- [ ] [Criterion 2: e.g., Public APIs are unchanged]
- [ ] [Criterion 3: e.g., System performance is maintained/improved]

## Questions for the Agent
1. [Question to force discovery of current state]
2. [Question to clarify constraints]
3. [Question about existing test coverage]

## Notes
- [Constraint/Preference 1]
- [Cache/Memory strategy]
- [Backwards compatibility requirements]
