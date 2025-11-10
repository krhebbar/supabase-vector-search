# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **CRITICAL**: Fixed SQL HAVING clause bug in `match_documents_weighted` function that prevented weighted search from working
- **CRITICAL**: Fixed missing section embeddings persistence in DocumentManager - now properly saves `embedding_section_1`, `embedding_section_2`, and `embedding_section_3`
- **HIGH**: Fixed sequential embedding generation in batch operations - now uses parallel processing for significant performance improvements
- **HIGH**: Fixed type signature mismatch in VectorSearchClient - now correctly uses `generateEmbedding` instead of `generateDocumentEmbeddings` for single-text embeddings

### Added
- Comprehensive retry logic utility (`src/utils/retry.ts`) with exponential backoff for transient failures
- Retry logic integrated into all DocumentManager operations (insert, update, delete, get, count)
- Retry logic integrated into all SearchManager operations (search, searchWeighted)
- Logger parameter support in DocumentManager for consistent logging across all managers
- Automatic weight normalization in SearchManager - weights are now auto-normalized to sum to 1.0
- Environment variable validation in all example scripts with clear error messages
- ESLint configuration with TypeScript support and recommended rules
- Prettier configuration for consistent code formatting
- `.nvmrc` file specifying Node.js 18.0.0 requirement
- New lint scripts: `lint`, `lint:fix`, `format`, `format:check`
- Test coverage script: `test:coverage`

### Changed
- DocumentManager constructor now accepts optional `logger` parameter for consistency with SearchManager
- Weight validation in SearchManager improved - now normalizes weights automatically instead of just warning
- VectorSearchClient now passes logger to DocumentManager for consistent logging

### Developer Experience
- Added comprehensive linting and formatting tooling (ESLint + Prettier)
- Environment variable validation prevents cryptic errors in examples
- Retry logic with logging provides better visibility into transient failures
- Normalized weights eliminate confusion around score interpretation

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Multi-vector weighted search with configurable section weights
- Single-vector semantic search
- OpenAI embedding provider (text-embedding-ada-002, text-embedding-3-small, text-embedding-3-large)
- Cohere embedding provider (embed-english-v3.0, embed-multilingual-v3.0)
- Document CRUD operations (insert, update, delete, get, count)
- Batch operations with progress tracking
- PostgreSQL pgvector extension support
- HNSW vector indexes for fast similarity search
- Comprehensive TypeScript type definitions
- Row-level security (RLS) support
- Metadata filtering for search queries
- Resume/candidate search example
- Document search example

### Database
- SQL migrations for pgvector setup
- Documents table with support for multiple vector embeddings per document
- `match_documents` function for single-vector search
- `match_documents_weighted` function for multi-vector weighted search
- HNSW indexes on all vector columns (m=16, ef_construction=64)
- GIN index on metadata JSONB column
- Automatic timestamp management (created_at, updated_at)

### Documentation
- Comprehensive README with quickstart guide
- CODE_REVIEW.md with repository guidelines
- AGENTS.md for AI agent development
- Inline code documentation and JSDoc comments
- Example scripts with step-by-step explanations

## Known Issues

### To Be Addressed in Future Releases
- Test coverage is minimal (only 2 basic unit tests)
  - Need comprehensive unit tests for all managers
  - Need integration tests with test database
  - Need tests for edge cases and error scenarios
  - Need tests for embedding providers
- No API documentation generation (TypeDoc)
- Fixed vector dimensions (1536) - need dimension-agnostic approach
- No migration rollback scripts provided

### Future Enhancements
- Caching layer for repeated queries
- Query embedding cache
- Sharding strategy for horizontal scaling
- Performance benchmarks and tuning guide
- Support for more embedding providers (Anthropic, HuggingFace)
- Monitoring and observability integration

---

## Migration Guide

### Upgrading from 1.0.0 to Unreleased

#### Breaking Changes
None - all changes are backward compatible.

#### New Features

**Retry Logic:**
All database operations now automatically retry on transient failures (up to 3 times with exponential backoff). No code changes required, but you may notice better reliability in production.

**Weight Normalization:**
Weights in `searchWeighted()` are now automatically normalized to sum to 1.0. Previously, you had to ensure weights summed to 1.0 manually. Old code will continue to work, but weights will be normalized automatically:

```typescript
// Before: Had to ensure weights sum to 1.0
await client.searchWeighted({
  queryEmbedding,
  weightMain: 0.25,
  weightSection1: 0.25,
  weightSection2: 0.25,
  weightSection3: 0.25,  // Must sum to 1.0
});

// After: Auto-normalized (but same result)
await client.searchWeighted({
  queryEmbedding,
  weightMain: 50,   // Will be normalized to 0.5
  weightSection2: 50,  // Will be normalized to 0.5
  // Total: 100 -> normalized to sum=1.0
});
```

**Logger Parameter:**
DocumentManager now accepts an optional logger parameter. Update your direct instantiations:

```typescript
// Before
const docManager = new DocumentManager(client, 'documents');

// After (optional logger)
const docManager = new DocumentManager(client, 'documents', customLogger);
```

Note: If you're using `createVectorSearchClient()`, no changes needed - logger is passed automatically.

#### Database Migration Required

**IMPORTANT**: Run the updated `005_weighted_search_function.sql` migration to fix the HAVING clause bug:

```bash
# If using Supabase CLI
supabase db reset

# Or apply manually
psql -f supabase/migrations/005_weighted_search_function.sql
```

This is required for weighted search to function correctly.

---

For more details, see the [CODE_REVIEW_REPORT.md](./CODE_REVIEW_REPORT.md) which contains the full analysis that led to these improvements.
