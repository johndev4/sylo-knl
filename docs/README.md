# Documentation Index

Guides and architectural references for **Sylo**.

## Setup & Operations

- **[Docker Setup Guide](DOCKER_SETUP.md)** — Run the Sylo web app with Docker Compose, configure `.env`, and connect to Supabase and Ollama.
- **[Embedding Worker Setup](EMBEDDING_API_GUIDE.md)** — Configure and verify the optional `pg_cron` fallback worker for `/api/embed-pending`.
- **[Server Action & API Logging](LOGGING.md)** — Structured logging configuration, request correlation, and secret redaction rules.

## Architecture & Design

- **[Document Save & Retrieval Architecture](DOCUMENT_SAVE_FLOW.md)** — Atomic document writes and asynchronous background embedding via `after()`.
- **[Tracking and Auditing](TRACKING_AND_AUDITING.md)** — Database-trigger-based `audit_logs` and `document_edits` architecture.
- **[Auth Provider Implementation Rationale](AUTH_PROVIDER_IMPLEMENTATION_RATIONALE.md)** — Why Sylo uses Supabase `onAuthStateChange` subscriptions instead of SWR.
