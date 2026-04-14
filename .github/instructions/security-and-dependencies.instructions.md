---
description: "Use when selecting libraries, adding dependencies, updating versions, scaffolding projects, or writing backend/frontend code that handles auth, data, APIs, files, or external input. Enforces secure-by-default implementation and dependency hygiene (LTS/latest stable + no known vulnerabilities)."
name: "Security And Dependency Hygiene"
applyTo: "**"
---
# Security And Dependency Hygiene

- Treat security as a release blocker for generated code and dependency choices.
- Prefer standard library or existing project dependencies before adding new packages.
- Only use actively maintained libraries from trusted publishers with recent stable releases.
- Choose LTS or latest stable versions (not alpha/beta/RC) unless explicitly requested.
- Reject deprecated, archived, or end-of-life libraries/framework versions.
- Treat known high/critical vulnerabilities as blocking; do not introduce those packages when a safe alternative exists.
- Moderate vulnerabilities should trigger caution, documented risk, and mitigation guidance.
- Follow OWASP guidance by default when implementing security controls.

## OWASP Alignment

- Map relevant threats and mitigations to OWASP Top 10 categories during implementation and review.
- For application security requirements, prefer OWASP ASVS as a baseline checklist.
- Use OWASP Cheat Sheet Series recommendations for secure patterns (auth, input validation, session management, cryptography, logging, and error handling).
- If a generated approach conflicts with OWASP guidance, revise toward the OWASP-aligned option unless the user explicitly overrides.

## Dependency Rules

- Minimize dependency count; add a package only with a short justification.
- Pin to safe, reproducible versions appropriate for the ecosystem.
- When proposing/installing packages, include a quick vulnerability check step.
- Prefer ecosystem-native security tooling:
- JavaScript/TypeScript: `npm audit --audit-level=moderate` (or `pnpm audit`/`yarn npm audit`)
- Python: `pip-audit` (or `poetry export` + `pip-audit`)
- .NET: `dotnet list package --vulnerable`
- Container images: prefer current stable base images and run image vulnerability scans

## Secure Coding Defaults

- Validate and sanitize all untrusted input at boundaries.
- Enforce authentication and authorization on protected actions.
- Use parameterized queries/ORM protections; never concatenate SQL.
- Avoid unsafe deserialization, command injection patterns, and unbounded file operations.
- Store secrets in environment/secret managers; never hardcode credentials or tokens.
- Use secure transport (HTTPS/TLS), safe cookie/session settings, and least-privilege permissions.
- Redact secrets/PII from logs and error messages.

## Delivery Expectations

- When generating code, include security-relevant tests where practical (auth checks, input validation, failure paths).
- If a requested package/version is risky, explain why and propose safer alternatives.
- If vulnerability status cannot be verified in the current environment, state that explicitly and provide exact commands to verify.
