-- Enable pgvector Extension
--
-- pgvector adds vector similarity search to PostgreSQL
-- Documentation: https://github.com/pgvector/pgvector
--
-- This migration:
-- 1. Enables the pgvector extension
-- 2. Creates the vector data type for storing embeddings
--
-- Vector dimensions are determined when creating table columns
-- Common sizes: 768 (Cohere), 1536 (OpenAI ada-002), 3072 (OpenAI text-embedding-3)

-- Enable pgvector extension in extensions schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
