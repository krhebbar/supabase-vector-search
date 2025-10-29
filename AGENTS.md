# Repository Guidelines

## Project Structure & Module Organization

Single TypeScript library with database-first architecture:

```
supabase-vector-search/
├── src/
│   ├── document/        # Document CRUD operations
│   ├── embeddings/      # Embedding provider integrations
│   ├── search/          # Search algorithms and strategies
│   └── types/           # TypeScript type definitions
├── supabase/
│   └── migrations/      # SQL migrations for pgvector setup
├── examples/            # Usage examples (document search, resume matching)
└── docs/                # Architecture and API documentation
```

**Database-First:** Requires PostgreSQL with pgvector extension.

## Build, Test, and Development Commands

```bash
npm run build            # Compile TypeScript to JavaScript
npm run build:watch      # Watch mode for development
npm run type-check       # TypeScript type checking
npm run clean            # Remove dist directory

# Run examples
npm run example:document-search   # Document semantic search
npm run example:resume-search     # Resume matching example

# Database setup (requires Supabase CLI)
supabase db reset               # Reset local database
supabase migration up           # Apply migrations
```

## Coding Style & Naming Conventions

**TypeScript:**
- Strict type checking enabled
- **Interfaces/Types:** PascalCase (`VectorSearchConfig`, `EmbeddingProvider`, `SearchResult`)
- **Functions:** camelCase (`searchDocuments()`, `generateEmbedding()`, `createIndex()`)
- **Files:** kebab-case (`vector-client.ts`, `embedding-provider.ts`)

**SQL Migrations:**
- Numbered sequentially: `20240101000000_create_vector_tables.sql`
- Descriptive names explaining purpose
- Include rollback instructions in comments

**Patterns:**
- Provider pattern for embedding services (OpenAI, Cohere)
- Peer dependencies for optional integrations
- Type-safe RPC calls to database functions

## Testing Guidelines

**Framework:** Tests should be added (currently no test suite configured)

**Recommended Setup:**
```bash
npm install --save-dev vitest @vitest/ui
```

**Test Focus:**
- Vector similarity calculations
- Multi-vector weighted search logic
- Embedding generation and caching
- Database function integration (RPC calls)

## Commit & Pull Request Guidelines

**Commit Format:** Conventional Commits

```
feat(search): add multi-vector weighted search
feat(embeddings): add Cohere provider support
fix(client): handle null embeddings gracefully
docs(examples): add resume matching example
perf(search): optimize HNSW index parameters
```

**Scopes:** `search`, `embeddings`, `client`, `migrations`, `examples`, `docs`

**PR Requirements:**
- Link related issues
- Include migration files for database schema changes
- Update examples if API changes
- Test against actual Supabase instance

## Database Setup & Migrations

**Prerequisites:**
1. Supabase project with PostgreSQL 14+
2. pgvector extension enabled

**Enable pgvector:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Migration Workflow:**
```bash
# Local development
supabase start                  # Start local Supabase
supabase migration up           # Apply migrations
supabase db reset               # Reset if needed

# Remote deployment
supabase db push                # Push migrations to remote
```

**Index Configuration:**
```sql
-- HNSW index for fast approximate search
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

## Vector Search Best Practices

**Embedding Generation:**
- Cache embeddings to avoid redundant API calls
- Batch multiple documents when possible
- Use appropriate embedding models per use case (OpenAI ada-002, Cohere)

**Search Strategies:**
- **Cosine Similarity:** Default for most text search
- **Euclidean Distance:** For normalized vectors
- **Max Inner Product:** For specific ML models

**Performance Optimization:**
- Use HNSW indexes for large datasets (> 10K vectors)
- Tune `m` (connections per layer) and `ef_construction` parameters
- Consider dimensionality reduction for very high-dimensional vectors

**Multi-Vector Search (Flexible Implementation):**

The current multi-vector search implementation uses a flexible JSONB column (`named_embeddings`) to store multiple named embeddings per document. This allows for a dynamic number of embeddings without requiring schema changes.

**Database Schema:**
- The `documents` table includes a `named_embeddings` JSONB column.
- This column stores an object where keys are embedding names (e.g., "title", "content") and values are the vector embeddings.

**Search Function:**
- The `match_documents_weighted` function accepts a JSONB object containing query embeddings and their weights.
- It dynamically calculates similarity by iterating over the `named_embeddings`.

**Example Usage:**
```typescript
// Search with dynamically weighted named embeddings
const results = await client.searchWeighted({
  queries: {
    title: { embedding: titleEmbedding, weight: 0.6 },
    content: { embedding: contentEmbedding, weight: 0.4 }
  },
  matchThreshold: 0.7,
  matchCount: 10
});
```

## Environment Setup

**Required:**
- Node.js >= 18.0.0
- Supabase project
- Supabase CLI for migrations

**Environment Variables:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-key  # If using OpenAI embeddings
```

**Peer Dependencies:**
Install separately based on needs:
```bash
npm install @supabase/supabase-js  # Always required
npm install openai                  # For OpenAI embeddings
```
