# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **CRITICAL**: SQL HAVING clause bug in `match_documents_weighted` function
- **CRITICAL**: Missing section embeddings persistence in DocumentManager  
- **HIGH**: Sequential embedding generation - now uses parallel processing
- **HIGH**: Type signature mismatch in VectorSearchClient

### Added
- Retry logic utility with exponential backoff for transient failures
- Logger parameter support in DocumentManager
- Automatic weight normalization in SearchManager
- Environment variable validation in examples
- ESLint and Prettier configuration
- `.nvmrc` file for Node.js version management
- New scripts: `lint`, `lint:fix`, `format`, `format:check`, `test:coverage`

### Changed
- DocumentManager now accepts optional `logger` parameter
- Weights in SearchManager auto-normalize to sum to 1.0
- Batch embedding generation now parallel for better performance

## [1.0.0] - 2024-XX-XX

### Initial Release

- Multi-vector weighted search with configurable section weights
- Single-vector semantic search
- OpenAI and Cohere embedding providers
- Document CRUD operations with batch support
- PostgreSQL pgvector extension support
- HNSW vector indexes for fast similarity search
- Comprehensive TypeScript type definitions
- Row-level security (RLS) support
- Metadata filtering for search queries
- Example scripts for resume and document search
- Comprehensive documentation and architecture guide

### Database
- SQL migrations for pgvector setup
- Documents table with multiple vector embeddings per document
- `match_documents` function for single-vector search
- `match_documents_weighted` function for multi-vector weighted search
- HNSW indexes on all vector columns
- GIN index on metadata JSONB column
- Automatic timestamp management

### Known Issues
- Test coverage is minimal
- No API documentation generation (TypeDoc)
- Fixed vector dimensions (1536)
- No migration rollback scripts

## Migration Guide

### Upgrading to Unreleased

**Breaking Changes:** None - all changes are backward compatible.

**Database Migration Required:** Run the updated `005_weighted_search_function.sql` migration to fix the HAVING clause bug:

```bash
psql -f supabase/migrations/005_weighted_search_function.sql
```

**Weight Normalization:** Weights in `searchWeighted()` are now auto-normalized to sum to 1.0.

**Logger Parameter:** DocumentManager now accepts an optional logger parameter:

```typescript
// Before
const docManager = new DocumentManager(client, 'documents');

// After (optional logger)
const docManager = new DocumentManager(client, 'documents', customLogger);
```

---

For detailed code review findings, see [CODE_REVIEW_REPORT.md](./CODE_REVIEW_REPORT.md).
