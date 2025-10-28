-- Create Weighted Multi-Vector Search Function
--
-- Advanced search function that combines multiple embeddings per document
-- with configurable weights for each section. This enables more nuanced
-- matching by giving different importance to different parts of documents.
--
-- Use Cases:
-- - Resume search: Weight experience (50%), skills (20%), education (10%), summary (20%)
-- - Product search: Weight title (40%), description (30%), reviews (20%), specs (10%)
-- - Article search: Weight title (30%), abstract (30%), body (25%), tags (15%)
--
-- Parameters:
-- - query_embedding: Main document embedding
-- - query_section_1: First section embedding (e.g., title, summary)
-- - query_section_2: Second section embedding (e.g., content, experience)
-- - query_section_3: Third section embedding (e.g., skills, metadata)
-- - weight_main: Weight for main embedding (default: 0.25)
-- - weight_section_1: Weight for section 1 (default: 0.25)
-- - weight_section_2: Weight for section 2 (default: 0.25)
-- - weight_section_3: Weight for section 3 (default: 0.25)
-- - match_threshold: Minimum weighted similarity (0-1, default: 0.5)
-- - match_count: Maximum results (default: 10)
-- - filter_metadata: Optional JSONB metadata filter
--
-- Returns:
-- - id: Document UUID
-- - content: Document text
-- - metadata: Document metadata
-- - similarity: Weighted similarity score (0-1)
-- - similarity_main: Individual similarity for main embedding
-- - similarity_section_1: Individual similarity for section 1
-- - similarity_section_2: Individual similarity for section 2
-- - similarity_section_3: Individual similarity for section 3

CREATE OR REPLACE FUNCTION public.match_documents_weighted(
  query_embedding vector(1536),
  query_section_1 vector(1536) DEFAULT NULL,
  query_section_2 vector(1536) DEFAULT NULL,
  query_section_3 vector(1536) DEFAULT NULL,
  weight_main float DEFAULT 0.25,
  weight_section_1 float DEFAULT 0.25,
  weight_section_2 float DEFAULT 0.25,
  weight_section_3 float DEFAULT 0.25,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_metadata jsonb DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float,
  similarity_main float,
  similarity_section_1 float,
  similarity_section_2 float,
  similarity_section_3 float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    -- Weighted similarity calculation
    -- COALESCE handles NULL embeddings (returns 0 if embedding is NULL)
    (
      COALESCE(1 - (documents.embedding <=> query_embedding), 0) * weight_main +
      COALESCE(
        CASE
          WHEN query_section_1 IS NOT NULL AND documents.embedding_section_1 IS NOT NULL
          THEN (1 - (documents.embedding_section_1 <=> query_section_1)) * weight_section_1
          ELSE 0
        END,
        0
      ) +
      COALESCE(
        CASE
          WHEN query_section_2 IS NOT NULL AND documents.embedding_section_2 IS NOT NULL
          THEN (1 - (documents.embedding_section_2 <=> query_section_2)) * weight_section_2
          ELSE 0
        END,
        0
      ) +
      COALESCE(
        CASE
          WHEN query_section_3 IS NOT NULL AND documents.embedding_section_3 IS NOT NULL
          THEN (1 - (documents.embedding_section_3 <=> query_section_3)) * weight_section_3
          ELSE 0
        END,
        0
      )
    ) AS similarity,
    -- Individual similarities for debugging/analysis
    (1 - (documents.embedding <=> query_embedding)) AS similarity_main,
    CASE
      WHEN query_section_1 IS NOT NULL AND documents.embedding_section_1 IS NOT NULL
      THEN (1 - (documents.embedding_section_1 <=> query_section_1))
      ELSE NULL
    END AS similarity_section_1,
    CASE
      WHEN query_section_2 IS NOT NULL AND documents.embedding_section_2 IS NOT NULL
      THEN (1 - (documents.embedding_section_2 <=> query_section_2))
      ELSE NULL
    END AS similarity_section_2,
    CASE
      WHEN query_section_3 IS NOT NULL AND documents.embedding_section_3 IS NOT NULL
      THEN (1 - (documents.embedding_section_3 <=> query_section_3))
      ELSE NULL
    END AS similarity_section_3
  FROM public.documents
  WHERE
    -- Metadata filter
    (
      filter_metadata IS NULL
      OR documents.metadata @> filter_metadata
    )
  -- Calculate weighted similarity in subquery for filtering
  HAVING
    (
      COALESCE(1 - (documents.embedding <=> query_embedding), 0) * weight_main +
      COALESCE(
        CASE
          WHEN query_section_1 IS NOT NULL AND documents.embedding_section_1 IS NOT NULL
          THEN (1 - (documents.embedding_section_1 <=> query_section_1)) * weight_section_1
          ELSE 0
        END,
        0
      ) +
      COALESCE(
        CASE
          WHEN query_section_2 IS NOT NULL AND documents.embedding_section_2 IS NOT NULL
          THEN (1 - (documents.embedding_section_2 <=> query_section_2)) * weight_section_2
          ELSE 0
        END,
        0
      ) +
      COALESCE(
        CASE
          WHEN query_section_3 IS NOT NULL AND documents.embedding_section_3 IS NOT NULL
          THEN (1 - (documents.embedding_section_3 <=> query_section_3)) * weight_section_3
          ELSE 0
        END,
        0
      )
    ) >= match_threshold
  ORDER BY
    similarity DESC
  LIMIT match_count;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION public.match_documents_weighted IS 'Multi-vector weighted similarity search with configurable section weights';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.match_documents_weighted TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_documents_weighted TO service_role;

-- Example Usage:
--
-- 1. Resume search (weighted for experience):
--    SELECT * FROM match_documents_weighted(
--      query_embedding := '[...]'::vector,           -- Full resume embedding
--      query_section_1 := '[...]'::vector,           -- Summary embedding
--      query_section_2 := '[...]'::vector,           -- Experience embedding
--      query_section_3 := '[...]'::vector,           -- Skills embedding
--      weight_main := 0.2,                           -- 20% main resume
--      weight_section_1 := 0.1,                      -- 10% summary
--      weight_section_2 := 0.5,                      -- 50% experience
--      weight_section_3 := 0.2,                      -- 20% skills
--      match_threshold := 0.6,
--      match_count := 25
--    );
--
-- 2. Product search (weighted for title and description):
--    SELECT * FROM match_documents_weighted(
--      query_embedding := '[...]'::vector,           -- Full product embedding
--      query_section_1 := '[...]'::vector,           -- Title embedding
--      query_section_2 := '[...]'::vector,           -- Description embedding
--      weight_main := 0.2,                           -- 20% full product
--      weight_section_1 := 0.5,                      -- 50% title
--      weight_section_2 := 0.3,                      -- 30% description
--      match_threshold := 0.7
--    );
--
-- 3. Single-vector search (using weighted function):
--    SELECT * FROM match_documents_weighted(
--      query_embedding := '[...]'::vector,
--      weight_main := 1.0                            -- 100% main embedding
--    );
--
-- 4. Hybrid search with metadata filtering:
--    SELECT * FROM match_documents_weighted(
--      query_embedding := '[...]'::vector,
--      query_section_2 := '[...]'::vector,
--      weight_main := 0.6,
--      weight_section_2 := 0.4,
--      filter_metadata := '{"category": "engineering", "level": "senior"}'::jsonb
--    );

-- Performance Notes:
--
-- 1. Weights should sum to 1.0 for normalized scores, but this is not enforced
-- 2. NULL embeddings are handled gracefully (treated as 0 similarity)
-- 3. Individual similarity scores help debug which sections are matching
-- 4. For best performance, ensure all vector indexes are built (migration 003)
-- 5. Consider caching query embeddings if searching repeatedly with same query

-- Weight Configuration Examples by Use Case:
--
-- Resume/Candidate Search:
--   - weight_main: 0.2 (full resume context)
--   - weight_section_1: 0.1 (education/summary)
--   - weight_section_2: 0.5 (experience - most important)
--   - weight_section_3: 0.2 (skills)
--
-- E-commerce Product Search:
--   - weight_main: 0.15 (full product)
--   - weight_section_1: 0.45 (title - most important)
--   - weight_section_2: 0.25 (description)
--   - weight_section_3: 0.15 (reviews/ratings)
--
-- Academic Paper Search:
--   - weight_main: 0.2 (full paper)
--   - weight_section_1: 0.35 (title + abstract)
--   - weight_section_2: 0.3 (methodology + results)
--   - weight_section_3: 0.15 (citations/references)
--
-- Documentation Search:
--   - weight_main: 0.25 (full document)
--   - weight_section_1: 0.35 (headings + summary)
--   - weight_section_2: 0.25 (code examples)
--   - weight_section_3: 0.15 (metadata/tags)
