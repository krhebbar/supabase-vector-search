-- Create Vector Indexes for Fast Similarity Search
--
-- This migration creates HNSW (Hierarchical Navigable Small World) indexes
-- on vector columns for efficient nearest neighbor search.
--
-- Index Types:
-- - HNSW: Best for high recall, recommended for production
-- - IVFFlat: Faster build time, lower recall (alternative)
--
-- Distance Operators:
-- - <=> : Cosine distance (1 - cosine similarity)
-- - <-> : L2 distance (Euclidean)
-- - <#> : Inner product
--
-- HNSW Parameters:
-- - m: Max connections per layer (default: 16, range: 2-100)
--   Higher m = better recall but slower build & more memory
-- - ef_construction: Size of dynamic candidate list (default: 64)
--   Higher ef_construction = better quality but slower build
--
-- Performance Notes:
-- - Index build time scales with dataset size
-- - HNSW indexes can be large (10-20% of vector data size)
-- - Consider building indexes AFTER bulk data import
-- - Use CONCURRENTLY for zero-downtime index creation on live tables

-- Main document embedding index (cosine distance)
-- This is typically the most important index for full-document search
CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON public.documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Section 1 embedding index (e.g., title, summary, metadata)
CREATE INDEX IF NOT EXISTS documents_embedding_section_1_idx
ON public.documents
USING hnsw (embedding_section_1 vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Section 2 embedding index (e.g., main content, experience)
CREATE INDEX IF NOT EXISTS documents_embedding_section_2_idx
ON public.documents
USING hnsw (embedding_section_2 vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Section 3 embedding index (e.g., skills, tags)
CREATE INDEX IF NOT EXISTS documents_embedding_section_3_idx
ON public.documents
USING hnsw (embedding_section_3 vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add comments for documentation
COMMENT ON INDEX public.documents_embedding_idx IS 'HNSW index for fast cosine similarity search on main document embeddings';
COMMENT ON INDEX public.documents_embedding_section_1_idx IS 'HNSW index for section 1 embeddings (e.g., title/summary)';
COMMENT ON INDEX public.documents_embedding_section_2_idx IS 'HNSW index for section 2 embeddings (e.g., content/experience)';
COMMENT ON INDEX public.documents_embedding_section_3_idx IS 'HNSW index for section 3 embeddings (e.g., skills/metadata)';

-- Query Performance Tips:
--
-- 1. Set ef_search for query-time recall tuning:
--    SET hnsw.ef_search = 100; -- Higher = better recall, slower queries
--
-- 2. Use EXPLAIN ANALYZE to verify index usage:
--    EXPLAIN ANALYZE SELECT * FROM documents
--    ORDER BY embedding <=> '[0.1, 0.2, ...]' LIMIT 10;
--
-- 3. For production, consider:
--    - Monitoring index size: SELECT pg_size_pretty(pg_relation_size('documents_embedding_idx'));
--    - Rebuilding indexes periodically if data changes significantly
--    - Using REINDEX CONCURRENTLY for zero-downtime rebuilds
--
-- 4. Alternative: IVFFlat indexes (faster build, lower recall)
--    CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
--    WITH (lists = 100);
--    -- lists should be roughly sqrt(total_rows), max 1000
--    -- SET ivfflat.probes = 10; for query-time tuning
