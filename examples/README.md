# Examples

This directory contains working examples demonstrating different use cases for the Supabase Vector Search Engine.

## Prerequisites

Before running the examples, ensure you have:

1. **Supabase Project Setup:**
   - Create a Supabase project at https://supabase.com
   - Run all migrations from `supabase/migrations/` in order
   - Get your project URL and anon/service key

2. **Environment Variables:**
   Create a `.env` file in the root directory:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-or-service-key
   OPENAI_API_KEY=sk-your-openai-api-key
   ```

3. **Dependencies:**
   ```bash
   npm install
   ```

## Running Examples

### Document Search (Simple)

Basic semantic search for general documents:

```bash
npx ts-node examples/document-search.ts
```

**What it demonstrates:**
- Single-vector embedding generation
- Batch document insertion
- Semantic similarity search
- Metadata filtering
- CRUD operations (get, update, delete)

**Use cases:**
- Knowledge base search
- Documentation search
- Article/blog search
- General text similarity

### Resume Search (Advanced)

Multi-vector weighted search for candidate matching:

```bash
npx ts-node examples/resume-search.ts
```

**What it demonstrates:**
- Multi-section document structure
- Weighted multi-vector search
- Section-specific embeddings (experience, skills, education)
- Configurable search weights
- Real-world recruiting use case

**Use cases:**
- Candidate/resume search
- Job matching
- Product search with multiple attributes
- Any domain with hierarchical importance

## Example Output

### Document Search

```
🚀 Document Search Example

🔄 Generating embeddings for documents...
   Progress: 5/5 documents embedded
   ✓ Generated 5 embeddings

💾 Inserting documents into Supabase...
   Progress: 5/5 documents inserted
   ✓ Inserted 5 documents

🔍 Search Example 1: Finding documents about vector search

   Query: "How do I implement semantic similarity search with vectors?"

   Found 3 relevant documents:

   1. Similarity: 87.3%
      "pgvector is a PostgreSQL extension for vector similarity search..."
      Category: database

   ...
```

### Resume Search

```
🚀 Resume Search Example

📋 Converting resume to searchable sections...
   - Full resume: Senior Software Engineer Tech Corp Led development...
   - Education: Stanford University Bachelor of Science...
   - Experience: Senior Software Engineer Tech Corp Led development...
   - Skills: TypeScript Node.js PostgreSQL Python FastAPI...

🔄 Generating embeddings with OpenAI...
   ✓ Generated 4 embeddings (resume, education, experience, skills)

🔍 Searching for candidates matching job description...
   Performing weighted search (50% exp, 20% skills, 20% resume, 10% edu)...

📊 Found 1 matching candidates:

1. Jane Smith
   Overall Similarity: 82.5%
   - Experience Match: 89.2%
   - Skills Match: 84.1%
   - Education Match: 71.3%
   Current Role: Senior Software Engineer at Tech Corp
```

## Customizing Examples

### Changing Embedding Provider

Both examples use OpenAI by default. To use Cohere:

```typescript
import { createCohereProvider } from '../src';

const provider = createCohereProvider({
  apiKey: process.env.COHERE_API_KEY!,
  model: 'embed-english-v3.0'
});
```

### Adjusting Search Weights

In the resume search example, modify weights based on your priorities:

```typescript
const results = await client.searchWeighted({
  queryEmbedding: queryEmbeddings.embedding!,
  querySection2: queryEmbeddings.embedding_section_2!,
  querySection3: queryEmbeddings.embedding_section_3!,
  weightMain: 0.3,        // 30% full resume
  weightSection1: 0.1,    // 10% education
  weightSection2: 0.4,    // 40% experience
  weightSection3: 0.2,    // 20% skills
  matchThreshold: 0.6,
});
```

### Adding More Documents

Extend the `documents` array in `document-search.ts`:

```typescript
const documents = [
  {
    content: 'Your document text...',
    metadata: {
      category: 'your-category',
      tags: ['tag1', 'tag2'],
      custom_field: 'custom value'
    }
  },
  // ... more documents
];
```

## Troubleshooting

### "Function match_documents does not exist"

Ensure you've run all migrations in order:
```sql
-- Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE 'match_documents%';
```

### "Column embedding does not exist"

Run migration `002_create_documents_table.sql`:
```bash
psql $DATABASE_URL -f supabase/migrations/002_create_documents_table.sql
```

### "Invalid API key"

Verify your environment variables are set correctly:
```bash
echo $OPENAI_API_KEY
echo $SUPABASE_URL
```

### High latency for embedding generation

Consider batching and rate limiting:
```typescript
const embeddings = await generateEmbeddingsBatch({
  texts: largeTextArray,
  batchSize: 50,      // Smaller batches
  delayMs: 1000,      // 1 second delay between batches
}, provider);
```

## Next Steps

- Read [ARCHITECTURE.md](../docs/ARCHITECTURE.md) for system design details
- See [README.md](../README.md) for API documentation
- Explore [SQL migrations](../supabase/migrations/) for database schema
- Check [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
