<div align="center">
  <img src="public/assets/logo/sylo-icon.svg" alt="Sylo Logo" width="120" height="120" style="margin-bottom: 1rem;" />
  <h1>Sylo-KNL</h1>
  <p><strong>AI-powered knowledge library with hybrid RAG retrieval and collaborative document management.</strong></p>
</div>

<p align="center">
  <a href="https://nextjs.org"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" /></a>
  <a href="https://react.dev"><img alt="React" src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" /></a>
  <a href="https://supabase.com"><img alt="Supabase" src="https://img.shields.io/badge/Supabase-pgvector-emerald?style=flat-square&logo=supabase" /></a>
  <a href="https://tailwindcss.com"><img alt="Tailwind CSS" src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwindcss" /></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript" /></a>
  <a href="#license"><img alt="License" src="https://img.shields.io/badge/License-MIT-green?style=flat-square" /></a>
</p>

<p align="center">
  <a href="#key-features"><img alt="Google Gemini" src="https://img.shields.io/badge/Google_Gemini-Supported-4285F4?style=flat-square&logo=google" /></a>
  <a href="#local-ai-with-ollama"><img alt="Ollama Local AI" src="https://img.shields.io/badge/Ollama_Local_AI-Supported-white?style=flat-square&logo=ollama&logoColor=black" /></a>
  <a href="#self-hosting-guide"><img alt="Self-Hosted" src="https://img.shields.io/badge/Self--Hosted-Ready-orange?style=flat-square" /></a>
  <a href="#2-vercel-hosting"><img alt="Vercel" src="https://img.shields.io/badge/Vercel-Deploy-black?style=flat-square&logo=vercel" /></a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Local Setup](#installation--local-setup)
  - [Environment Variables](#environment-variables)
  - [Database Setup & Migrations](#database-setup--migrations)
  - [Available Scripts](#available-scripts)
  - [Unit Tests](#unit-tests)
- [Deployment](#deployment)
  - [1. Supabase (Database & Auth)](#1-supabase-database--auth)
  - [2. Vercel (Hosting)](#2-vercel-hosting)
- [Self-Hosting Guide](#self-hosting-guide)
  - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
  - [Option B: Manual Host Build](#option-b-manual-host-build)
  - [Local AI with Ollama](#local-ai-with-ollama)
  - [Self-Hosted Supabase](#self-hosted-supabase)
- [License](#license)

---

## Overview

**Sylo** is a modern, open-source AI knowledge library designed to organize, search, and converse with your documents. It pairs a block-based editor with an intelligent Retrieval-Augmented Generation (RAG) pipeline, enabling teams and individuals to build structured knowledge bases and query them with context-aware AI chat.

Sylo is engineered to give you complete ownership of your data: deploy it securely in the cloud with Supabase and Vercel, or run it 100% locally and offline using Ollama and self-hosted Postgres.

---

## Key Features

- 🔍 **Hybrid Multi-Library RAG**: Retrieve relevant context across multiple knowledge libraries simultaneously using `pgvector` semantic vector similarity search.
- ⚡ **Dual AI Core (Cloud & Local)**: Provider-agnostic LLM architecture supporting Google Gemini for cloud scale or Ollama for private, on-premise text generation and embeddings.
- 📝 **Block-Based Rich Text Editor**: Notion-style modular editor powered by BlockNote and ProseMirror with real-time editing and clean Markdown interchange.
- 👥 **Role-Based Access Control (RBAC)**: Fine-grained permissions (`Owner`, `Admin`, `Editor`, `Viewer`) enforced at both database level (Row-Level Security) and API endpoints.
- 🔄 **Atomic Chunking & Ingestion**: Transactional document updates, automated semantic chunking, embedding generation, and audit trail logging.
- 🎨 **Modern Interface**: Built with Tailwind CSS v4, shadcn/ui primitives, and Kokonut UI animations.

---

## Tech Stack

| Layer               | Technology                                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| **Framework**       | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/)   |
| **Language**        | [TypeScript](https://www.typescriptlang.org/)                                    |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL + `pgvector`, Row-Level Security)  |
| **AI & RAG**        | [Vercel AI SDK](https://sdk.vercel.ai/), Google Gemini, Ollama                   |
| **Styling**         | [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) |
| **Document Engine** | [BlockNote](https://www.blocknotejs.org/) (ProseMirror)                          |

---

## Getting Started

### Prerequisites

- **Node.js**: `24.x`
- **Package Manager**: [pnpm](https://pnpm.io/) (recommended) or `npm`
- **Database**: A local or cloud [Supabase](https://supabase.com) instance
- **AI Access**: Google AI Studio API key OR a local [Ollama](https://ollama.ai/) instance

### Installation & Local Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/sylo-knl.git
   cd sylo-knl
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Configure environment variables**:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your database credentials and AI provider configuration (see [Environment Variables](#environment-variables) below).

4. **Initialize database schema**:
   Apply migrations to your local Supabase instance:

   ```bash
   supabase db push
   ```

   For the optional cron-based embedding fallback, set `CRON_SECRET` in the app
   environment and add matching `cron_secret` and `embed_worker_base_url` values
   to that database's Vault in Supabase Studio. This is configured separately
   for local and remote databases. See the
   [Embedding & Background Indexing Guide](docs/EMBEDDING_API_GUIDE.md).

5. **Start the development server**:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Environment Variables

Configure the following variables in `.env.local`:

```env
# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: set only if enabling the pg_cron embedding fallback.
# Store the same generated secret in Supabase Vault as `cron_secret`.
# CRON_SECRET="<generate-a-random-secret>"

# Supabase (Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
SUPABASE_SECRET_KEY="your-service-role-key"

# AI Provider Configuration ('google' or 'ollama')
LLM_PROVIDER="google"
EMBEDDING_PROVIDER="google"

# Google AI (Required if provider is 'google')
GOOGLE_GENERATIVE_AI_API_KEY="your-google-api-key"

# Ollama Configuration (Required if provider is 'ollama')
OLLAMA_BASE_URL="http://localhost:11434/api"
OLLAMA_LLM_MODEL="gemma4:e4b"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text:v1.5"
```

---

### Database Setup & Migrations

Database schema migrations are located in `supabase/migrations/` and include schema definitions, Row-Level Security policies, and vector similarity search RPC functions (`match_document_chunks_multi`).

Using the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
# Start local Supabase containers (Docker required)
supabase start

# Apply pending migrations to the local database
supabase migration up

# Link to an existing remote project
supabase link --project-ref <your-project-ref>

supabase db push --remote
```

The cron migration registers the fallback embedding worker. Vault secrets are
not required to apply migrations; configure them separately in Studio for each
database where you want the cron fallback enabled. See the
[Embedding & Background Indexing Guide](docs/EMBEDDING_API_GUIDE.md) for setup
and verification steps.

---

### Available Scripts

| Command                 | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `pnpm dev`              | Starts the Next.js development server at `http://localhost:3000` |
| `pnpm build`            | Builds the optimized production application                      |
| `pnpm start`            | Runs the compiled production build                               |
| `pnpm lint`             | Runs ESLint validation                                           |
| `pnpm lint:fix`         | Runs ESLint and auto-fixes issues                                |
| `pnpm format`           | Formats code using Prettier                                      |
| `pnpm format:check`     | Checks formatting without writing changes                        |
| `pnpm test:unit`        | Runs Jest unit tests                                             |
| `pnpm test:e2e`         | Runs Playwright end-to-end test suite                            |
| `pnpm migrate:re-embed` | Utility script to re-generate document embeddings                |

### Unit Tests

Jest discovers unit tests in `tests/unit/**/*.test.ts` (see `jest.config.cjs`). Run the full unit test suite with:

```bash
pnpm exec jest --runInBand
```

To run one test file, pass its path:

```bash
pnpm exec jest --runInBand tests/unit/query-analyzer.test.ts
```

---

## Deployment

### 1. Supabase (Database & Auth)

1. Create a project at [supabase.com](https://supabase.com).
2. Retrieve your **Project URL**, **anon/publishable key**, and **service_role key** from **Project Settings > API**.
3. Link your local CLI to your project and push migrations:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
4. In **Authentication > URL Configuration**, set the Site URL to your production domain (e.g., `https://your-domain.vercel.app`) and add `https://your-domain.vercel.app/**` to the Redirect URLs list.

### 2. Vercel (Hosting)

Sylo is optimized for seamless deployment on Vercel:

1. Push your code to a GitHub repository.
2. Import the repository into [Vercel](https://vercel.com/new).
3. Set **Framework Preset** to **Next.js**.
4. Configure the environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_APP_URL`: Your production URL
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase anon key
   - `SUPABASE_SECRET_KEY`: Supabase service role key
   - `CRON_SECRET`: only when enabling the pg_cron fallback; use the same secret in the production Supabase Vault
   - `LLM_PROVIDER`: `google`
   - `EMBEDDING_PROVIDER`: `google`
   - `GOOGLE_GENERATIVE_AI_API_KEY`: Google AI Studio API key
5. Click **Deploy**.

> **CI/CD via GitHub Actions**: The repository includes a pre-configured workflow in `.github/workflows/deploy-vercel.yml`. To enable automated deployments from GitHub, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to your GitHub repository secrets.

---

## Self-Hosting Guide

Sylo can be self-hosted in air-gapped or privacy-conscious environments without sending any documents or queries to third-party AI services.

### Option A: Docker Compose (Recommended)

Run the Sylo web application in Docker using `docker-compose.yml` (connects to a cloud or local Supabase instance and optional host Ollama):

```bash
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
# Edit .env with your Supabase and AI provider settings
docker compose up --build -d
```

See the full **[Docker Setup Guide](docs/DOCKER_SETUP.md)** for prerequisites, `.env` configuration, local Supabase LAN IP networking, database migrations, and Ollama setup.

### Option B: Manual Host Build

Build and run the Next.js production server directly on your host (after configuring `.env.local` or `.env.production` and applying [Database Setup & Migrations](#database-setup--migrations)):

```bash
# Build the production bundle
pnpm build

# Start the standalone server
pnpm start -p 3000
```

Alternatively, reverse-proxy port `3000` behind Nginx, Caddy, or Traefik with SSL certificates configured.

### Local AI with Ollama

1. Install [Ollama](https://ollama.ai/download) on your host or server.
2. Pull the embedding model and generation model:
   ```bash
   ollama pull nomic-embed-text:v1.5
   ollama pull gemma4:e4b
   # or any other supported model (e.g. mistral, llama3)
   ```
3. Start the Ollama server:
   ```bash
   ollama serve
   ```
4. Set the following in `.env.local` (for local `pnpm dev`) or `.env` (for Docker):
   ```env
   LLM_PROVIDER="ollama"
   EMBEDDING_PROVIDER="ollama"
   # Use http://host.docker.internal:11434/api when running Sylo inside Docker
   OLLAMA_BASE_URL="http://localhost:11434/api"
   OLLAMA_LLM_MODEL="gemma4:e4b"
   OLLAMA_EMBEDDING_MODEL="nomic-embed-text:v1.5"
   ```

### Self-Hosted Supabase

You can run Supabase locally or on your own VPS using [Docker Compose](https://supabase.com/docs/guides/self-hosting/docker):

1. Follow the official [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting/docker).
2. Ensure the `pgvector` extension is enabled.
3. Apply migrations using `supabase db push --db-url "<database-url>"` (see [Database Setup & Migrations](#database-setup--migrations)).

---

## License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute this software in accordance with the license conditions.
