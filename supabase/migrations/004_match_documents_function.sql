-- Create Match Documents Function
--
-- Basic vector similarity search function that finds documents
-- similar to a query embedding using cosine similarity.
--
-- This function provides simple, single-vector search.
-- For multi-vector weighted search, see 005_weighted_search_function.sql
--
-- Parameters:
-- - query_embedding: The embedding vector to search for (1536 dimensions)
-- - match_threshold: Minimum similarity score (0-1, default: 0.5)
-- - match_count: Maximum number of results to return (default: 10)
-- - filter_metadata: Optional JSONB filter for metadata column
--
-- Returns:
-- - id: Document UUID
-- - content: Document text content
-- - metadata: Document metadata (JSONB)
-- - similarity: Cosine similarity score (0-1, higher is better)
--
-- Usage Example:
-- SELECT * FROM match_documents(
--   query_embedding := '[0.1, 0.2, ..., 0.5]'::vector,
--   match_threshold := 0.7,
--   match_count := 5
-- );

CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_metadata jsonb DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    -- Convert cosine distance to similarity (1 - distance)
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM public.documents
  WHERE
    -- Only return results above threshold
    1 - (documents.embedding <=> query_embedding) >= match_threshold
    -- Apply metadata filter if provided
    AND (
      filter_metadata IS NULL
      OR documents.metadata @> filter_metadata
    )
  ORDER BY
    -- Sort by similarity (closest first)
    documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION public.match_documents IS 'Find documents similar to query embedding using cosine similarity';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.match_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_documents TO service_role;

-- Example Queries:
--
-- 1. Basic similarity search:
--    SELECT * FROM match_documents('[0.1, 0.2, ...]'::vector);
--
-- 2. High-precision search (higher threshold):
--    SELECT * FROM match_documents(
--      query_embedding := '[0.1, 0.2, ...]'::vector,
--      match_threshold := 0.8,
--      match_count := 20
--    );
--
-- 3. Search with metadata filtering:
--    SELECT * FROM match_documents(
--      query_embedding := '[0.1, 0.2, ...]'::vector,
--      filter_metadata := '{"category": "resume", "status": "active"}'::jsonb
--    );
--
-- 4. Hybrid search (vector + text):
--    SELECT * FROM match_documents('[0.1, 0.2, ...]'::vector)
--    WHERE content ILIKE '%engineer%'
--    ORDER BY similarity DESC;

-- Performance Considerations:
--
-- 1. The HNSW index (from migration 003) will automatically be used
--    for the ORDER BY embedding <=> query_embedding clause
--
-- 2. For large datasets, consider:
--    - Adjusting match_count to limit results
--    - Using higher match_threshold to reduce candidates
--    - Partitioning documents table by category/date
--
-- 3. Monitor query performance:
--    EXPLAIN ANALYZE SELECT * FROM match_documents('[...]'::vector);
