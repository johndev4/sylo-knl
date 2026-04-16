-- Create EmbeddingModel enum type
CREATE TYPE "public"."EmbeddingModel" AS ENUM (
  'GOOGLE_GEMINI_3072',
  'OLLAMA_NOMIC_1536',
  'OLLAMA_CUSTOM'
);

-- Alter DocumentChunk table to add new fields for embedding metadata
ALTER TABLE "public"."DocumentChunk"
ADD COLUMN "embeddingModel" "public"."EmbeddingModel" NOT NULL DEFAULT 'GOOGLE_GEMINI_3072',
ADD COLUMN "embeddingDimension" INTEGER NOT NULL DEFAULT 3072;

-- Change embedding column from vector(3072) to unsized vector
-- Note: PostgreSQL requires dropping the column and recreating it to change the vector size
ALTER TABLE "public"."DocumentChunk"
DROP COLUMN IF EXISTS "embedding";

ALTER TABLE "public"."DocumentChunk"
ADD COLUMN "embedding" vector;

-- Create indexes for efficient querying by embedding model
CREATE INDEX "DocumentChunk_embeddingModel_idx" ON "public"."DocumentChunk" USING BTREE ("embeddingModel");
CREATE INDEX "DocumentChunk_documentId_embeddingModel_idx" ON "public"."DocumentChunk" USING BTREE ("documentId", "embeddingModel");
