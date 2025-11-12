# Supabase Vector Search Engine

Experimental vector similarity search for Supabase with PostgreSQL and pgvector. Supports advanced multi-vector weighted search for semantic matching at scale.

**Extracted from real-world recruiting system** handling candidate searches with configurable weighted scoring across resume sections.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)

## Features

- **Multi-Vector Weighted Search** - Search across multiple document sections with configurable weights
- **Multiple Embedding Providers** - OpenAI and Cohere support out of the box
- **Type-Safe API** - Full TypeScript support with comprehensive types
- **Batch Operations** - Efficient bulk insertion and embedding generation
- **Metadata Filtering** - Combine vector search with JSONB metadata queries
- **Real-World Tested** - Based on real-world candidate search system
- **HNSW Indexes** - Fast approximate nearest neighbor search
- **Flexible Architecture** - Easy to extend with custom providers

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Usage](#usage)
  - [Basic Document Search](#basic-document-search)
  - [Multi-Vector Weighted Search](#multi-vector-weighted-search)
  - [Batch Operations](#batch-operations)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Architecture](#architecture)
- [Performance](#performance)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

```typescript
import {
  createVectorSearchClient,
  createOpenAIProvider,
  generateDocumentEmbeddings
} from 'supabase-vector-search';

// 1. Initialize provider and client
const provider = createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!
});

const client = createVectorSearchClient({
  url: process.env.SUPABASE_URL!,
  key: process.env.SUPABASE_KEY!
});

// 2. Generate embeddings and insert document
const embeddings = await generateDocumentEmbeddings({
  main: "Full document text...",
  section_1: "Title and summary",
  section_2: "Main content"
}, provider);

await client.insertDocument({
  content: "Full document text...",
  ...embeddings,
  metadata: { category: "article" }
});

// 3. Search for similar documents
const queryEmbedding = await provider.generateEmbedding("search query");
const results = await client.search({
  queryEmbedding: queryEmbedding[0],
  matchThreshold: 0.7,
  matchCount: 10
});
```

## Installation

```bash
npm install supabase-vector-search @supabase/supabase-js openai
```

Or with Cohere:

```bash
npm install supabase-vector-search @supabase/supabase-js
```

## Database Setup

### 1. Run Migrations

Execute the SQL migrations in order to set up your Supabase database:

```bash
# From Supabase Studio SQL Editor or psql
psql $DATABASE_URL -f supabase/migrations/001_enable_pgvector.sql
psql $DATABASE_URL -f supabase/migrations/002_create_documents_table.sql
psql $DATABASE_URL -f supabase/migrations/003_create_vector_indexes.sql
psql $DATABASE_URL -f supabase/migrations/004_match_documents_function.sql
psql $DATABASE_URL -f supabase/migrations/005_weighted_search_function.sql
```

### 2. Verify Setup

```sql
-- Check if pgvector is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE 'match_documents%';
```

## Usage

### Basic Document Search

Simple semantic search using single embeddings:

```typescript
import { createVectorSearchClient, createOpenAIProvider, generateEmbedding } from 'supabase-vector-search';

// Initialize
const provider = createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! });
const client = createVectorSearchClient({
  url: process.env.SUPABASE_URL!,
  key: process.env.SUPABASE_KEY!
});

// Insert documents
const embedding = await generateEmbedding("PostgreSQL is a powerful database", provider);
await client.insertDocument({
  content: "PostgreSQL is a powerful database",
  embedding,
  metadata: { category: "database" }
});

// Search
const queryEmbedding = await generateEmbedding("Tell me about databases", provider);
const results = await client.search({
  queryEmbedding,
  matchThreshold: 0.7,
  matchCount: 5,
  filterMetadata: { category: "database" } // Optional metadata filter
});

results.forEach(result => {
  console.log(`Similarity: ${result.similarity}`);
  console.log(`Content: ${result.content}`);
});
```

### Multi-Vector Weighted Search

Advanced search across multiple document sections with configurable weights:

```typescript
import { generateDocumentEmbeddings } from 'supabase-vector-search';

// Generate embeddings for all sections
const embeddings = await generateDocumentEmbeddings({
  main: "Full document text combining all sections",
  section_1: "Title and summary section",
  section_2: "Main content and details",
  section_3: "Tags and metadata"
}, provider);

// Insert document with all embeddings
await client.insertDocument({
  content: "Full document text",
  embedding: embeddings.embedding!,
  embedding_section_1: embeddings.embedding_section_1!,
  embedding_section_2: embeddings.embedding_section_2!,
  embedding_section_3: embeddings.embedding_section_3!,
  metadata: { type: "article" }
});

// Search with weighted scoring
const queryEmbeddings = await generateDocumentEmbeddings({
  main: "Search query",
  section_1: "Title keywords",
  section_2: "Content keywords",
  section_3: "Tag keywords"
}, provider);

const results = await client.searchWeighted({
  queryEmbedding: queryEmbeddings.embedding!,
  querySection1: queryEmbeddings.embedding_section_1,
  querySection2: queryEmbeddings.embedding_section_2,
  querySection3: queryEmbeddings.embedding_section_3,
  weightMain: 0.25,      // 25% main document match
  weightSection1: 0.35,  // 35% title match (most important)
  weightSection2: 0.30,  // 30% content match
  weightSection3: 0.10,  // 10% tags match
  matchThreshold: 0.6,
  matchCount: 10
});

// Results include individual section scores
results.forEach(result => {
  console.log(`Overall Similarity: ${result.similarity}`);
  console.log(`  - Title Match: ${result.similarity_section_1}`);
  console.log(`  - Content Match: ${result.similarity_section_2}`);
  console.log(`  - Tags Match: ${result.similarity_section_3}`);
});
```

### Batch Operations

Efficiently process large numbers of documents:

```typescript
import { generateEmbeddingsBatch } from 'supabase-vector-search';

// Generate embeddings for many documents
const texts = [/* array of 1000 documents */];
const embeddings = await generateEmbeddingsBatch({
  texts,
  batchSize: 100,
  delayMs: 1000, // Rate limiting
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
}, provider);

// Batch insert documents
const documents = texts.map((text, i) => ({
  content: text,
  embedding: embeddings[i],
  metadata: { source: "import" }
}));

await client.insertDocumentsBatch(documents, 100, (completed, total) => {
  console.log(`Inserted: ${completed}/${total}`);
});
```

## API Reference

### Vector Search Client

#### `createVectorSearchClient(config, embeddingProvider?)`

Create a new vector search client.

**Parameters:**
- `config.url` - Supabase project URL
- `config.key` - Supabase anon or service role key
- `config.tableName` - Optional table name (default: 'documents')
- `embeddingProvider` - Optional embedding provider instance

**Methods:**
- `insertDocument(document)` - Insert single document
- `insertDocumentsBatch(documents, batchSize?, onProgress?)` - Batch insert
- `search(options)` - Single-vector search
- `searchWeighted(options)` - Multi-vector weighted search
- `getDocument(id)` - Get document by ID
- `updateDocument(id, updates)` - Update document
- `deleteDocument(id)` - Delete document
- `countDocuments(filterMetadata?)` - Count documents

### Embedding Providers

#### `createOpenAIProvider(config)`

Create OpenAI embedding provider.

**Config:**
- `apiKey` - OpenAI API key
- `model` - Model name (default: 'text-embedding-ada-002')
- `organization` - Optional organization ID
- `maxRetries` - Max retry attempts (default: 3)
- `timeout` - Request timeout in ms (default: 60000)

**Supported Models:**
- `text-embedding-ada-002` - 1536 dimensions
- `text-embedding-3-small` - 1536 dimensions
- `text-embedding-3-large` - 3072 dimensions

#### `createCohereProvider(config)`

Create Cohere embedding provider.

**Config:**
- `apiKey` - Cohere API key
- `model` - Model name (default: 'embed-english-v3.0')
- `inputType` - Input type (default: 'search_document')
- `truncate` - Truncation strategy (default: 'END')

**Supported Models:**
- `embed-english-v3.0` - 1024 dimensions
- `embed-multilingual-v3.0` - 1024 dimensions
- `embed-english-light-v3.0` - 384 dimensions
- `embed-multilingual-light-v3.0` - 384 dimensions

### Embedding Utilities

#### `generateDocumentEmbeddings(sections, provider)`

Generate embeddings for multi-section document.

**Parameters:**
- `sections.main` - Full document text (required)
- `sections.section_1` - First section (optional)
- `sections.section_2` - Second section (optional)
- `sections.section_3` - Third section (optional)
- `provider` - Embedding provider instance

**Returns:** `DocumentEmbeddings` object with embedding vectors

#### `generateEmbedding(text, provider)`

Generate single embedding.

**Parameters:**
- `text` - Text to embed
- `provider` - Embedding provider instance

**Returns:** Embedding vector (number array)

#### `generateEmbeddingsBatch(options, provider)`

Generate embeddings for multiple texts.

**Options:**
- `texts` - Array of texts
- `batchSize` - Batch size (default: 100)
- `delayMs` - Delay between batches (default: 0)
- `onProgress` - Progress callback

## Examples

### Resume/Candidate Search

Weighted search prioritizing experience over other sections:

```typescript
// 50% experience, 20% skills, 20% resume, 10% education
const results = await client.searchWeighted({
  queryEmbedding: resumeEmbedding,
  querySection1: educationEmbedding,
  querySection2: experienceEmbedding,
  querySection3: skillsEmbedding,
  weightMain: 0.2,
  weightSection1: 0.1,  // education
  weightSection2: 0.5,  // experience (most important)
  weightSection3: 0.2,  // skills
  matchThreshold: 0.6
});
```

See [examples/resume-search.ts](examples/resume-search.ts) for complete example.

### Product Search

Weighted search prioritizing title and description:

```typescript
const results = await client.searchWeighted({
  queryEmbedding: productEmbedding,
  querySection1: titleEmbedding,
  querySection2: descriptionEmbedding,
  querySection3: reviewsEmbedding,
  weightMain: 0.2,
  weightSection1: 0.5,  // title (most important)
  weightSection2: 0.25, // description
  weightSection3: 0.05, // reviews
});
```

### Hybrid Search (Vector + Text)

Combine vector search with PostgreSQL full-text search:

```typescript
// Vector search
const vectorResults = await client.search({
  queryEmbedding,
  matchThreshold: 0.5
});

// Additional text filtering using Supabase client
const hybridResults = await client
  .getSupabaseClient()
  .from('documents')
  .select()
  .in('id', vectorResults.map(r => r.id))
  .textSearch('content', 'keyword', { type: 'websearch' });
```

## Architecture

The system consists of four main components:

1. **SQL Migrations** - Database schema and functions (pgvector, indexes, search functions)
2. **Embedding Providers** - Pluggable providers for different embedding models
3. **Vector Search Client** - High-level API for search operations
4. **TypeScript Types** - Comprehensive type definitions

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Performance

### Index Configuration

HNSW indexes provide fast approximate nearest neighbor search:

- **m=16** - Connections per layer (higher = better recall, more memory)
- **ef_construction=64** - Build quality (higher = better quality, slower build)
- **Cosine distance** - Distance metric for embeddings

### Query Performance Tuning

```sql
-- Adjust search quality vs speed tradeoff
SET hnsw.ef_search = 100; -- Higher = better recall, slower queries

-- Monitor query performance
EXPLAIN ANALYZE
SELECT * FROM match_documents('[...]'::vector);
```

### Best Practices

1. **Batch inserts** - Use `insertDocumentsBatch()` for large datasets
2. **Build indexes after bulk import** - Faster than incremental builds
3. **Adjust match_threshold** - Higher threshold = faster queries, fewer results
4. **Use metadata filtering** - Combine with vector search for better performance
5. **Monitor index size** - HNSW indexes are ~10-20% of vector data size

## Use Cases

- **Candidate/Resume Search** - Match job descriptions to candidate profiles
- **Semantic Documentation Search** - Find relevant docs based on meaning
- **Product Discovery** - Search products by description similarity
- **Content Recommendation** - Recommend similar articles/posts
- **Customer Support** - Match support tickets to knowledge base
- **Academic Paper Search** - Find related research papers

## Requirements

- Node.js >= 18.0.0
- PostgreSQL >= 14 with pgvector extension
- Supabase project or PostgreSQL database
- OpenAI or Cohere API key

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

**Ravindra Kanchikare (krhebber)**

- GitHub: [@krhebber](https://github.com/krhebber)
- LinkedIn: [ravindrakanchikare](https://linkedin.com/in/ravindrakanchikare)

## Acknowledgments

- Built on [pgvector](https://github.com/pgvector/pgvector) by Andrew Kane
- Powered by [Supabase](https://supabase.com)
- Based on real-world recruiting system handling candidate searches

## Related Projects

- [AI Resume Toolkit](https://github.com/krhebber/ai-resume-toolkit) - Resume parsing and scoring
- [Supabase Workflow Engine](https://github.com/krhebber/supabase-workflow-engine) - Workflow automation
- [Interview Scheduling Engine](https://github.com/krhebber/interview-scheduling-engine) - Smart scheduling

---

**Star this repository if you find it useful!**
