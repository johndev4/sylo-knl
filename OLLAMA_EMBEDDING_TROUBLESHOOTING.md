# Ollama Embedding Troubleshooting Guide

This guide helps diagnose and fix issues with Ollama embeddings in the RAG system.

## Error: "Ollama batch embedding generation failed: Not Found"

### Root Causes

The "Not Found" error typically means one of the following:

1. **Ollama service is not running**
   - The SDK cannot connect to `OLLAMA_BASE_URL`
   - Default: `http://localhost:11434`

2. **Embedding model is not available locally**
   - The model specified in `OLLAMA_EMBEDDING_MODEL` hasn't been pulled
   - The model name/tag is incorrect or unavailable

3. **Base URL is incorrect**
   - Check if Ollama is running on a different host/port

### Diagnostic Steps

#### 1. Verify Ollama is running

```bash
# Test connectivity to Ollama
curl http://localhost:11434/api/tags

# Expected response:
# {"models": [...], "models_total": 123}
```

If this fails, **Ollama is not running**:
```bash
# Start Ollama (MacOS/Linux)
ollama serve

# Or on Windows, ensure the Ollama app is running
```

#### 2. Check available models

```bash
# List all pulled models
ollama list

# Example output:
# NAME                    ID              SIZE    MODIFIED
# nomic-embed-text:latest abc123...      274 MB  2 minutes ago
# mistral:latest          def456...      4.1 GB  5 hours ago
```

#### 3. Verify your configured model exists

Check your `.env` file:
```env
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

If the model is NOT in your `ollama list` output, pull it:
```bash
# Pull the embedding model
ollama pull nomic-embed-text

# Or other popular embedding models:
ollama pull bge-small
ollama pull bge-m3
```

#### 4. Check base URL configuration

In `.env`:
```env
OLLAMA_BASE_URL=http://localhost:11434
```

Adjust if Ollama runs on a different host/port:
```env
# Example: if Ollama runs on remote machine
OLLAMA_BASE_URL=http://192.168.1.100:11434
```

### Environment Configuration

Update your `.env` with a working embedding model. We recommend:

#### Option 1: `nomic-embed-text` (recommended, stable)
```env
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_EMBEDDING_DIMENSION=1536
```
Pull: `ollama pull nomic-embed-text`

#### Option 2: `bge-small` (smaller, faster)
```env
OLLAMA_EMBEDDING_MODEL=bge-small
OLLAMA_EMBEDDING_DIMENSION=384
```
Pull: `ollama pull bge-small`

#### Option 3: `bge-m3` (multilingual)
```env
OLLAMA_EMBEDDING_MODEL=bge-m3
OLLAMA_EMBEDDING_DIMENSION=384
```
Pull: `ollama pull bge-m3`

### Server Logs

The API will now log detailed debugging information. Check your server console:

```
[OLLAMA EMBEDMANY ERROR] {
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
  textCount: 5,
  message: "Error details here",
  status: 404,
  errorType: "Error"
}
```

### Recovery: Switch Back to Google

If you need to temporarily use Google embeddings while setting up Ollama:

```env
LLM_PROVIDER=google
EMBEDDING_PROVIDER=google

# Google API key (must be set)
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
```

Then restart your dev server:
```bash
npm run dev
```

### After Fixing

1. Ensure Ollama is running with the correct model
2. Update `.env` with available model
3. Restart the dev server: `npm run dev`
4. Try ingesting a document again

If embedding issues persist, check:
- Network connectivity to Ollama
- Ollama service status: `curl http://localhost:11434/api/tags`
- Model is pulled: `ollama list`
- Server console for detailed error logs

---

**Related files:**
- Configuration: `.env`
- Provider Implementation: `src/lib/ai/providers/ollama.provider.ts`
- API Route: `src/app/api/documents/route.ts`
- Embeddings Core: `src/lib/ai/embeddings.ts`
