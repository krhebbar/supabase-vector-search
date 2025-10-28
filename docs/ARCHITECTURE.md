# Architecture Documentation

This document provides a comprehensive overview of the Supabase Vector Search Engine architecture, design decisions, and implementation details.

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Database Schema](#database-schema)
- [Vector Search Strategy](#vector-search-strategy)
- [Embedding Generation](#embedding-generation)
- [Search Algorithms](#search-algorithms)
- [Performance Optimization](#performance-optimization)
- [Scalability Considerations](#scalability-considerations)
- [Security](#security)

## System Overview

The Supabase Vector Search Engine is a production-ready semantic search system built on PostgreSQL and pgvector. It was extracted from a real-world candidate search system and generalized for broader use cases.

### Key Design Principles

1. **Production-First** - Based on battle-tested code from production recruiting system
2. **Flexibility** - Pluggable embedding providers and configurable search weights
3. **Type Safety** - Comprehensive TypeScript types for better developer experience
4. **Performance** - HNSW indexes and batch operations for scale
5. **Simplicity** - Clean API that abstracts complexity

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Application Layer                      │
│  ┌──────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Document Search  │  │ Resume Search   │  │ Custom App  │ │
│  └────────┬─────────┘  └────────┬────────┘  └──────┬──────┘ │
└───────────┼────────────────────┼──────────────────┼─────────┘
            │                    │                  │
            └────────────────────┼──────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────┐
│                  TypeScript Client Layer                      │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │            VectorSearchClient                          │  │
│  │  - insertDocument()                                    │  │
│  │  - search()                                            │  │
│  │  - searchWeighted()                                    │  │
│  │  - CRUD operations                                     │  │
│  └───────────────┬────────────────────────┬───────────────┘  │
│                  │                        │                  │
│   ┌──────────────▼────────┐   ┌──────────▼──────────┐       │
│   │ Embedding Providers   │   │  Type Definitions   │       │
│   │  - OpenAIProvider     │   │  - Document         │       │
│   │  - CohereProvider     │   │  - SearchOptions    │       │
│   │  - Custom Provider    │   │  - SearchResult     │       │
│   └──────────────┬────────┘   └─────────────────────┘       │
└──────────────────┼──────────────────────────────────────────┘
                   │
                   │ Embeddings
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Supabase / PostgreSQL                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  documents Table                     │    │
│  │  - id (UUID)                                        │    │
│  │  - content (TEXT)                                   │    │
│  │  - metadata (JSONB)                                 │    │
│  │  - embedding (vector(1536))                         │    │
│  │  - embedding_section_1 (vector(1536))               │    │
│  │  - embedding_section_2 (vector(1536))               │    │
│  │  - embedding_section_3 (vector(1536))               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                HNSW Vector Indexes                   │    │
│  │  - documents_embedding_idx                          │    │
│  │  - documents_embedding_section_1_idx                │    │
│  │  - documents_embedding_section_2_idx                │    │
│  │  - documents_embedding_section_3_idx                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Search Functions (SQL)                  │    │
│  │  - match_documents(...)                             │    │
│  │  - match_documents_weighted(...)                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               pgvector Extension                     │    │
│  │  - vector data type                                 │    │
│  │  - <=> (cosine distance operator)                   │    │
│  │  - HNSW index algorithm                             │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Database Layer (PostgreSQL + pgvector)

**Responsibilities:**
- Store documents and vector embeddings
- Execute vector similarity searches using HNSW indexes
- Apply metadata filters using JSONB operators
- Manage Row Level Security (RLS) policies

**Key Technologies:**
- PostgreSQL 14+
- pgvector extension
- HNSW (Hierarchical Navigable Small World) indexes
- JSONB for metadata storage

### 2. TypeScript Client Layer

**Responsibilities:**
- Provide high-level API for vector search operations
- Handle Supabase client configuration
- Batch operations with progress tracking
- Error handling and validation

**Key Classes:**
- `VectorSearchClient` - Main client for search operations
- `EmbeddingProvider` - Abstract interface for embedding providers
- Type definitions for documents, search options, and results

### 3. Embedding Provider Layer

**Responsibilities:**
- Generate vector embeddings from text
- Support multiple embedding models and providers
- Handle API rate limiting and retries
- Batch embedding generation

**Implementations:**
- `OpenAIEmbeddingProvider` - OpenAI text-embedding models
- `CohereEmbeddingProvider` - Cohere embed models
- Extensible for custom providers

### 4. Application Layer

**Responsibilities:**
- Business logic specific to use case
- Document structure and section extraction
- Custom metadata handling
- Search weight configuration

## Database Schema

### documents Table

```sql
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    content TEXT NOT NULL,

    -- Flexible metadata (JSONB for dynamic fields)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Vector embeddings (1536 dims for OpenAI ada-002)
    embedding vector(1536),
    embedding_section_1 vector(1536),
    embedding_section_2 vector(1536),
    embedding_section_3 vector(1536),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Design Decisions:**

1. **UUID Primary Key** - Better for distributed systems and avoids sequential ID leakage
2. **JSONB Metadata** - Flexible schema for custom fields without migrations
3. **Multiple Vector Columns** - Enables multi-vector weighted search (production requirement)
4. **Nullable Embeddings** - Allow documents without embeddings (to be generated later)
5. **Timestamps** - Audit trail and sorting capability

### Indexes

```sql
-- Vector indexes (HNSW for fast ANN search)
CREATE INDEX documents_embedding_idx
ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Metadata index (GIN for JSONB queries)
CREATE INDEX documents_metadata_gin_idx
ON documents USING gin(metadata);

-- Created timestamp (B-tree for sorting)
CREATE INDEX documents_created_at_idx
ON documents(created_at DESC);
```

**Index Strategy:**

- **HNSW** for vector columns - Approximate nearest neighbor (ANN) search
- **GIN** for metadata - Efficient JSONB containment queries
- **B-tree** for timestamps - Range queries and sorting

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Documents are viewable by authenticated users"
    ON public.documents FOR SELECT
    TO authenticated
    USING (true);

-- Service role has full access
CREATE POLICY "Service role has full access"
    ON public.documents
    TO service_role
    USING (true)
    WITH CHECK (true);
```

## Vector Search Strategy

### Single-Vector Search

Basic semantic search using one embedding per document:

```
Query Text → Embedding → Vector Search → Results
```

**Use Cases:**
- Simple document search
- FAQ matching
- Basic semantic search

**SQL Function:**
```sql
match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_metadata jsonb DEFAULT NULL
)
```

### Multi-Vector Weighted Search

Advanced search using multiple embeddings per document with configurable weights:

```
Query Sections → Multiple Embeddings → Weighted Scoring → Results
```

**Weighted Scoring Formula:**
```
similarity = (
  similarity_main * weight_main +
  similarity_section_1 * weight_section_1 +
  similarity_section_2 * weight_section_2 +
  similarity_section_3 * weight_section_3
)
```

**Use Cases:**
- Resume search (prioritize experience > skills > education)
- Product search (prioritize title > description > reviews)
- Multi-attribute matching with hierarchical importance

**SQL Function:**
```sql
match_documents_weighted(
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
```

## Embedding Generation

### Provider Pattern

The system uses a provider pattern for embedding generation, allowing easy switching between providers:

```typescript
interface EmbeddingProvider {
  name: string;
  dimensions: number;
  generateEmbedding(input: string | string[]): Promise<Embedding[]>;
  getConfig(): EmbeddingProviderConfig;
}
```

### Supported Providers

| Provider | Model | Dimensions | Max Tokens |
|----------|-------|-----------|------------|
| OpenAI | text-embedding-ada-002 | 1536 | 8,191 |
| OpenAI | text-embedding-3-small | 1536 | 8,191 |
| OpenAI | text-embedding-3-large | 3072 | 8,191 |
| Cohere | embed-english-v3.0 | 1024 | 512 |
| Cohere | embed-multilingual-v3.0 | 1024 | 512 |

### Batch Processing

For large datasets, embeddings are generated in batches:

```typescript
generateEmbeddingsBatch({
  texts: [...],
  batchSize: 100,      // Provider-specific limits
  delayMs: 1000,       // Rate limiting
  onProgress: (...)    // Progress tracking
}, provider)
```

**Benefits:**
- Avoid API rate limits
- Progress tracking for long operations
- Efficient parallel processing

## Search Algorithms

### Cosine Similarity

The system uses cosine similarity to measure vector similarity:

```
similarity = 1 - (embedding1 <=> embedding2)
```

Where `<=>` is the pgvector cosine distance operator.

**Properties:**
- Range: 0 (orthogonal) to 1 (identical)
- Normalized: Magnitude-independent
- Fast: Optimized by HNSW index

### HNSW Index Algorithm

Hierarchical Navigable Small World (HNSW) provides approximate nearest neighbor search:

**How it works:**
1. Builds multi-layer graph structure
2. Each layer has progressively fewer nodes
3. Search starts at top layer, navigates down
4. Uses "greedy" best-first search at each layer

**Parameters:**
- `m` (16) - Connections per layer
  - Higher = better recall, more memory, slower build
- `ef_construction` (64) - Build quality
  - Higher = better index quality, slower build

**Query-time tuning:**
```sql
SET hnsw.ef_search = 100; -- Higher = better recall, slower queries
```

## Performance Optimization

### Index Build Strategy

1. **Bulk import first** - Insert all documents without indexes
2. **Build indexes after** - Much faster than incremental
3. **CONCURRENTLY option** - Zero-downtime for live databases

```sql
-- Build index without blocking reads
CREATE INDEX CONCURRENTLY documents_embedding_idx
ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Query Optimization

1. **Adjust match_threshold** - Filter candidates early
2. **Use metadata filters** - Reduce search space
3. **Limit match_count** - Return only top results
4. **Tune ef_search** - Balance recall vs speed

### Batch Operations

- Insert documents in batches of 100-500
- Generate embeddings in parallel
- Use progress callbacks for monitoring

## Scalability Considerations

### Horizontal Scaling

- **Read replicas** - Distribute search queries
- **Connection pooling** - Supabase handles this automatically
- **Caching layer** - Cache frequent query embeddings

### Vertical Scaling

- **Memory** - HNSW indexes are memory-intensive
  - Estimate: 10-20% of vector data size
  - 1M documents × 1536 dims × 4 bytes × 1.2 = ~7.4 GB
- **CPU** - Index building is CPU-intensive
- **Storage** - SSD strongly recommended for index performance

### Dataset Size Guidelines

| Documents | Memory | Index Build | Query Latency |
|-----------|--------|-------------|---------------|
| 10K | ~50 MB | ~1 min | <10 ms |
| 100K | ~500 MB | ~10 min | <20 ms |
| 1M | ~5 GB | ~2 hours | <50 ms |
| 10M | ~50 GB | ~20 hours | <100 ms |

## Security

### Row Level Security (RLS)

Supabase RLS policies control access at row level:

```sql
-- Example: User-specific documents
CREATE POLICY "Users see own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (metadata->>'user_id' = auth.uid()::text);
```

### API Key Management

- Use environment variables for API keys
- Rotate keys periodically
- Use service role key for server-side operations
- Use anon key for client-side with RLS

### Data Privacy

- Embeddings are NOT reversible to original text
- Consider PII in metadata fields
- Use RLS to isolate tenant data

## Production Learnings

This system was extracted from a production recruiting platform. Key learnings:

### 1. Weighted Search is Critical

Single-vector search was insufficient for resume matching. Experience should count more than education. Multi-vector weighted search improved match quality significantly.

**Production weights for resume search:**
- 50% Experience (most important)
- 20% Skills
- 20% Full resume context
- 10% Education

### 2. Metadata Filtering Improves Performance

Combining vector search with metadata filters:
- Reduces candidate set before vector search
- Improves precision for filtered categories
- Faster queries on large datasets

### 3. Batch Operations are Essential

- Individual API calls are too slow for bulk operations
- Batching reduced embedding generation from hours to minutes
- Progress tracking is important for UX

### 4. Index Management Matters

- Build indexes AFTER bulk import (10x faster)
- Monitor index size (grew to 2 GB for 500K resumes)
- Periodic reindexing improves quality

## Future Enhancements

Potential improvements for future versions:

1. **Hybrid Search** - Combine vector search with BM25 full-text search
2. **Query Expansion** - Use LLMs to expand queries before embedding
3. **Reranking** - Second-stage LLM reranking for top results
4. **Custom Embeddings** - Fine-tuned models for specific domains
5. **Streaming Results** - Real-time result streaming for large queries
6. **Multi-tenancy** - Built-in tenant isolation

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [HNSW Algorithm Paper](https://arxiv.org/abs/1603.09320)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated:** 2025-01-28
**Author:** Ravindra Kanchikare (krhebber)
