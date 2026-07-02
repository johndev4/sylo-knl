#!/usr/bin/env python3
"""
Re-embed existing documents using a new embedding model.

Supports Google and Ollama providers with batch processing,
pre-flight validation, dry-run mode, and comprehensive error recovery.
"""

import argparse
import logging
import os
import sys
import time
from datetime import datetime
from typing import Optional
from uuid import UUID

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


class Config:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.llm_provider = os.getenv("LLM_PROVIDER", "google").lower()
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
            )

        if self.llm_provider == "google" and not self.google_api_key:
            raise ValueError(
                "GOOGLE_API_KEY environment variable is required for Google provider"
            )

    def validate(self):
        logger.info(
            f"Config: provider={self.llm_provider}, supabase_url={self.supabase_url[:30]}..."
        )


def get_db_client():
    config = Config()
    config.validate()
    return create_client(config.supabase_url, config.supabase_key), config


def validate_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid UUID: {value}")


def test_embedding_provider(
    provider: str, api_key: Optional[str] = None, base_url: Optional[str] = None
) -> int:
    """Test embedding provider and return vector dimension."""
    try:
        if provider == "google":
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            response = genai.embed_content(
                model="models/embedding-001",
                content="test",
            )
            vector_dim = len(response["embedding"])
            logger.info(f"Google provider test successful: vector_dim={vector_dim}")
            return vector_dim
        elif provider == "ollama":
            response = requests.post(
                f"{base_url}/api/embed",
                json={"model": "nomic-embed-text", "input": "test"},
                timeout=10,
            )
            response.raise_for_status()
            embedding = response.json()["embeddings"][0]
            vector_dim = len(embedding)
            logger.info(f"Ollama provider test successful: vector_dim={vector_dim}")
            return vector_dim
        else:
            raise ValueError(f"Unknown provider: {provider}")
    except Exception as e:
        logger.error(f"Provider test failed: {e}")
        raise


def verify_database_schema(client, library_id: str) -> dict:
    """Verify database schema and get library info."""
    try:
        result = (
            client.table("libraries")
            .select("id, name")
            .eq("id", library_id)
            .single()
            .execute()
        )
        library = result.data
        logger.info(f"Library found: {library['name']} (id={library_id})")

        doc_count = (
            client.table("documents")
            .select("id", count="exact")
            .eq("library_id", library_id)
            .is_("deleted_at", "NULL")
            .execute()
        )
        doc_count_value = (
            doc_count.count if hasattr(doc_count, "count") else len(doc_count.data)
        )
        logger.info(f"Documents in library: {doc_count_value}")

        chunk_count = (
            client.table("document_chunks")
            .select("id", count="exact")
            .in_(
                "document_id",
                [
                    d["id"]
                    for d in client.table("documents")
                    .select("id")
                    .eq("library_id", library_id)
                    .execute()
                    .data
                ],
            )
            .execute()
        )
        chunk_count_value = (
            chunk_count.count
            if hasattr(chunk_count, "count")
            else len(chunk_count.data)
        )
        logger.info(f"Chunks in library: {chunk_count_value}")

        sample_chunk = (
            client.table("document_chunks")
            .select("embedding")
            .not_("embedding", "is", None)
            .limit(1)
            .execute()
        )
        if sample_chunk.data:
            current_dim = len(sample_chunk.data[0]["embedding"])
            logger.info(f"Current vector dimension: {current_dim}")
        else:
            current_dim = None
            logger.warning("No existing embeddings found in library")

        return {
            "library_id": library_id,
            "library_name": library["name"],
            "doc_count": doc_count_value,
            "chunk_count": chunk_count_value,
            "current_vector_dim": current_dim,
        }
    except Exception as e:
        logger.error(f"Database schema verification failed: {e}")
        raise


def fetch_documents_batch(client, library_id: str, offset: int, limit: int) -> list:
    """Fetch non-deleted documents in batch."""
    try:
        result = (
            client.table("documents")
            .select("id, title")
            .eq("library_id", library_id)
            .is_("deleted_at", "NULL")
            .order("created_at")
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error(f"Failed to fetch documents batch at offset {offset}: {e}")
        return []


def fetch_chunks_for_documents(client, doc_ids: list) -> dict:
    """Fetch all chunks for given document IDs."""
    try:
        result = (
            client.table("document_chunks")
            .select("id, document_id, content")
            .in_("document_id", doc_ids)
            .execute()
        )
        chunks_by_doc = {}
        for chunk in result.data:
            doc_id = chunk["document_id"]
            if doc_id not in chunks_by_doc:
                chunks_by_doc[doc_id] = []
            chunks_by_doc[doc_id].append(chunk)
        return chunks_by_doc
    except Exception as e:
        logger.error(f"Failed to fetch chunks for documents: {e}")
        return {}


def generate_embeddings_batch(
    texts: list,
    provider: str,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> Optional[list]:
    """Generate embeddings for a batch of texts."""
    try:
        if provider == "google":
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            response = genai.embed_content(
                model="models/embedding-001",
                content=texts,
            )
            if "embedding" in response:
                return [response["embedding"]]
            else:
                return response.get("embeddings", [])
        elif provider == "ollama":
            response = requests.post(
                f"{base_url}/api/embed",
                json={"model": "nomic-embed-text", "input": texts},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["embeddings"]
        else:
            raise ValueError(f"Unknown provider: {provider}")
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        return None


def update_chunks_embeddings(client, updates: list, dry_run: bool) -> bool:
    """Batch update chunk embeddings."""
    if dry_run:
        logger.info(f"DRY RUN: Would update {len(updates)} chunks")
        return True

    try:
        for update in updates:
            client.table("document_chunks").update(
                {"embedding": update["embedding"]}
            ).eq("id", update["chunk_id"]).execute()
        logger.info(f"Updated {len(updates)} chunks in database")
        return True
    except Exception as e:
        logger.error(f"Failed to update chunks: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Re-embed documents in a library with a new embedding model"
    )
    parser.add_argument(
        "--library-id",
        type=validate_uuid,
        required=True,
        help="UUID of the library to re-embed",
    )
    parser.add_argument(
        "--new-model", type=str, default=None, help="Embedding model (google or ollama)"
    )
    parser.add_argument(
        "--batch-size", type=int, default=100, help="Documents per batch (default: 100)"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Preview changes without committing"
    )

    args = parser.parse_args()
    library_id = str(args.library_id)
    batch_size = args.batch_size
    dry_run = args.dry_run

    logger.info("=" * 80)
    logger.info("Starting re-embed process")
    logger.info(f"Library ID: {library_id}")
    logger.info(f"Batch size: {batch_size}")
    logger.info(f"Dry run: {dry_run}")
    logger.info("=" * 80)

    try:
        client, config = get_db_client()
        provider = (args.new_model or config.llm_provider).lower()

        logger.info(f"Testing embedding provider: {provider}")
        new_vector_dim = test_embedding_provider(
            provider, config.google_api_key, config.ollama_base_url
        )

        logger.info("Verifying database schema...")
        lib_info = verify_database_schema(client, library_id)

        if lib_info["chunk_count"] == 0:
            logger.warning("No chunks found in library. Aborting.")
            return 2

        logger.info(f"New vector dimension: {new_vector_dim}")
        if (
            lib_info["current_vector_dim"]
            and lib_info["current_vector_dim"] != new_vector_dim
        ):
            logger.warning(
                f"Vector dimension mismatch: current={lib_info['current_vector_dim']}, new={new_vector_dim}"
            )

        if dry_run:
            logger.info("DRY RUN MODE - No changes will be committed")

        start_time = time.time()
        total_chunks_re_embedded = 0
        failed_batches = 0
        total_docs = lib_info["doc_count"]
        total_batches = (total_docs + batch_size - 1) // batch_size

        for batch_idx in range(total_batches):
            offset = batch_idx * batch_size
            docs = fetch_documents_batch(client, library_id, offset, batch_size)

            if not docs:
                logger.warning(
                    f"Batch {batch_idx + 1}/{total_batches}: No documents fetched"
                )
                failed_batches += 1
                continue

            doc_ids = [doc["id"] for doc in docs]
            chunks_by_doc = fetch_chunks_for_documents(client, doc_ids)

            all_chunks = []
            chunk_ids = []
            for doc_id in doc_ids:
                if doc_id in chunks_by_doc:
                    for chunk in chunks_by_doc[doc_id]:
                        all_chunks.append(chunk["content"])
                        chunk_ids.append(chunk["id"])

            if not all_chunks:
                logger.warning(
                    f"Batch {batch_idx + 1}/{total_batches}: No chunks found for {len(docs)} documents"
                )
                failed_batches += 1
                continue

            embeddings = generate_embeddings_batch(
                all_chunks, provider, config.google_api_key, config.ollama_base_url
            )

            if not embeddings or len(embeddings) != len(all_chunks):
                logger.error(
                    f"Batch {batch_idx + 1}/{total_batches}: Embedding mismatch. "
                    f"Expected {len(all_chunks)}, got {len(embeddings) if embeddings else 0}"
                )
                failed_batches += 1
                continue

            updates = [
                {"chunk_id": chunk_id, "embedding": embedding}
                for chunk_id, embedding in zip(chunk_ids, embeddings)
            ]

            if update_chunks_embeddings(client, updates, dry_run):
                total_chunks_re_embedded += len(updates)
                logger.info(
                    f"Batch {batch_idx + 1}/{total_batches}: re-embedded {len(updates)} chunks "
                    f"({len(docs)} docs), vector_dim={new_vector_dim}"
                )
            else:
                failed_batches += 1

        elapsed_time = time.time() - start_time

        logger.info("=" * 80)
        logger.info("Re-embed process completed")
        logger.info(f"Total documents processed: {total_docs}")
        logger.info(f"Total chunks re-embedded: {total_chunks_re_embedded}")
        logger.info(f"Failed batches: {failed_batches}")
        logger.info(f"Execution time: {elapsed_time:.2f} seconds")
        if dry_run:
            logger.info("No changes committed (dry run)")
        else:
            logger.info("All changes committed to database")
        logger.info("=" * 80)

        return 0 if failed_batches == 0 else 1

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        logger.error("=" * 80)
        return 2


if __name__ == "__main__":
    sys.exit(main())
