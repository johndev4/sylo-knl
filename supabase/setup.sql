-- Supabase Initial Setup Script for Knowledge Library
-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the tables directly to avoid Prisma issues with vectors without DB connection initially
CREATE TABLE IF NOT EXISTS public."User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."Space" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "isShared" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE public."Role" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

CREATE TABLE IF NOT EXISTS public."SpaceMember" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "spaceId" UUID NOT NULL REFERENCES public."Space"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  role public."Role" NOT NULL DEFAULT 'VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("spaceId", "userId")
);

CREATE TABLE IF NOT EXISTS public."Document" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "spaceId" UUID NOT NULL REFERENCES public."Space"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."DocumentChunk" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentId" UUID NOT NULL REFERENCES public."Document"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create vector index
CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_idx" ON public."DocumentChunk" USING hnsw (embedding vector_cosine_ops);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public."Space" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SpaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DocumentChunk" ENABLE ROW LEVEL SECURITY;

-- Disable RLS constraints strictly for the service role (Prisma client usually operates as postgres/service role)
-- But let's create a policy to allow all authenticated requests for simplicity in MVP
-- (In production, you would tightly bind this to spaceId matching userId)
CREATE POLICY "Enable read access for all users" ON public."User" FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users" ON public."User" USING (true);

-- 5. Trigger to copy Supabase auth users to our public."User" table
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, "avatarUrl", "createdAt", "updatedAt")
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
