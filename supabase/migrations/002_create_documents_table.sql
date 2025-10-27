-- Create Documents Table with Vector Columns
--
-- This table stores documents with their embeddings for semantic search.
-- Supports multi-vector approach: store multiple embeddings per document
-- for different sections (e.g., title, content, summary, metadata).
--
-- Schema Design:
-- - id: Unique identifier
-- - content: Full text content of the document
-- - metadata: Flexible JSONB for custom fields
-- - embedding: Full document embedding (1536 dimensions for OpenAI ada-002)
-- - embedding_section_1: Optional secondary embedding (e.g., title/summary)
-- - embedding_section_2: Optional tertiary embedding (e.g., key content)
-- - embedding_section_3: Optional quaternary embedding (e.g., metadata)
-- - created_at/updated_at: Timestamps

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    content TEXT NOT NULL,

    -- Flexible metadata storage (JSON)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Vector embeddings (1536 dimensions for OpenAI text-embedding-ada-002)
    -- Adjust dimensions based on your embedding model:
    -- - OpenAI ada-002: 1536
    -- - OpenAI text-embedding-3-small: 1536
    -- - OpenAI text-embedding-3-large: 3072
    -- - Cohere embed-english-v3.0: 1024
    embedding vector(1536),

    -- Optional: Additional embeddings for multi-vector search
    -- Use these for granular section-based matching
    embedding_section_1 vector(1536),
    embedding_section_2 vector(1536),
    embedding_section_3 vector(1536),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS documents_metadata_gin_idx ON public.documents USING gin(metadata);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON public.documents(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
-- Default: Allow all authenticated users to read
CREATE POLICY "Documents are viewable by authenticated users"
    ON public.documents FOR SELECT
    TO authenticated
    USING (true);

-- Default: Allow service role full access
CREATE POLICY "Service role has full access to documents"
    ON public.documents
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Optional: Allow users to insert their own documents
-- Uncomment and modify if needed:
-- CREATE POLICY "Users can insert their own documents"
--     ON public.documents FOR INSERT
--     TO authenticated
--     WITH CHECK (auth.uid()::text = metadata->>'user_id');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.documents IS 'Stores documents with vector embeddings for semantic search';
COMMENT ON COLUMN public.documents.embedding IS 'Full document embedding (1536 dims for OpenAI ada-002)';
COMMENT ON COLUMN public.documents.embedding_section_1 IS 'Optional: First section embedding (e.g., title, summary)';
COMMENT ON COLUMN public.documents.embedding_section_2 IS 'Optional: Second section embedding (e.g., main content)';
COMMENT ON COLUMN public.documents.embedding_section_3 IS 'Optional: Third section embedding (e.g., metadata, tags)';
COMMENT ON COLUMN public.documents.metadata IS 'Flexible JSONB storage for custom document attributes';
