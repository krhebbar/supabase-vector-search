# Contributing to Supabase Vector Search Engine

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## How to Contribute

### Reporting Issues

If you find a bug or have a feature request:

1. **Search existing issues** to avoid duplicates
2. **Create a new issue** with a clear title and description
3. **Include details:**
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Environment details (Node version, PostgreSQL version, pgvector version)
   - Code examples or error messages

### Submitting Pull Requests

1. **Fork the repository** and create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation as needed
   - Keep commits focused and atomic

3. **Test your changes:**
   ```bash
   npm run type-check
   npm run build
   npm run example:document-search
   npm run example:resume-search
   ```

4. **Submit your PR:**
   - Write a clear PR title and description
   - Reference related issues
   - Explain your changes and rationale
   - Include examples if applicable

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14 with pgvector extension
- Supabase account (or local PostgreSQL)
- OpenAI or Cohere API key

### Installation

```bash
# Clone the repository
git clone https://github.com/krhebber/supabase-vector-search.git
cd supabase-vector-search

# Install dependencies
npm install
```

### Database Setup

1. Create a Supabase project or local PostgreSQL database
2. Run migrations in order:
   ```bash
   psql $DATABASE_URL -f supabase/migrations/001_enable_pgvector.sql
   psql $DATABASE_URL -f supabase/migrations/002_create_documents_table.sql
   psql $DATABASE_URL -f supabase/migrations/003_create_vector_indexes.sql
   psql $DATABASE_URL -f supabase/migrations/004_match_documents_function.sql
   psql $DATABASE_URL -f supabase/migrations/005_weighted_search_function.sql
   ```

3. Create `.env` file:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-service-role-key
   OPENAI_API_KEY=sk-your-api-key
   ```

### Project Structure

```
supabase-vector-search/
├── src/
│   ├── types/            # TypeScript type definitions
│   ├── embeddings/       # Embedding providers
│   │   └── providers/    # OpenAI, Cohere implementations
│   ├── search/           # Vector search client
│   └── index.ts          # Main exports
├── supabase/
│   └── migrations/       # SQL migrations
├── examples/             # Working examples
├── docs/                 # Documentation
└── dist/                 # Build output (generated)
```

## Areas for Contribution

We welcome contributions in these areas:

### High Priority

1. **Additional Embedding Providers**
   - HuggingFace embeddings
   - Local embedding models (Ollama)
   - Azure OpenAI support
   - Vertex AI embeddings

2. **Enhanced Search Features**
   - Hybrid search (vector + full-text)
   - Query expansion with LLMs
   - Result reranking
   - Filtering before vector search

3. **Testing**
   - Unit tests for providers
   - Integration tests for search
   - Performance benchmarks
   - Example test cases

### Medium Priority

4. **Performance Optimizations**
   - Connection pooling strategies
   - Query result caching
   - Batch operation improvements
   - Index tuning guidance

5. **Documentation**
   - More use case examples
   - Video tutorials
   - Migration guides
   - API reference improvements

6. **Developer Experience**
   - CLI tool for management
   - Migration helpers
   - Debugging utilities
   - Logging improvements

### Lower Priority

7. **Advanced Features**
   - Multi-tenancy helpers
   - Data versioning
   - A/B testing support
   - Analytics integration

## Code Style Guidelines

### TypeScript

- Use **strict mode** (`tsconfig.json` with `"strict": true`)
- Follow existing patterns in the codebase
- Use **meaningful variable names**
- Add **JSDoc comments** for public APIs
- Prefer **interfaces** over `any` types
- Use **async/await** over promises with `.then()`

Example:
```typescript
/**
 * Generate embeddings for document sections
 *
 * @param sections - Document sections to embed
 * @param provider - Embedding provider instance
 * @returns Document embeddings for all sections
 */
export async function generateDocumentEmbeddings(
  sections: DocumentSections,
  provider: EmbeddingProvider
): Promise<DocumentEmbeddings> {
  // Implementation
}
```

### SQL

- Follow PostgreSQL conventions
- Add comments to explain complex queries
- Use meaningful function/index names
- Include performance considerations

Example:
```sql
-- Create HNSW index for fast vector search
-- m=16: connections per layer (higher = better recall)
-- ef_construction=64: build quality
CREATE INDEX documents_embedding_idx
ON documents USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

## Adding a New Embedding Provider

To add support for a new embedding provider:

1. Create provider file in `src/embeddings/providers/`:

```typescript
// src/embeddings/providers/custom.ts
import { Embedding, EmbeddingProvider, EmbeddingProviderConfig } from '../../types';

export class CustomEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'custom';
  public readonly dimensions: number;

  constructor(config: CustomProviderConfig) {
    // Initialize provider
  }

  async generateEmbedding(input: string | string[]): Promise<Embedding[]> {
    // Implementation
  }

  getConfig(): EmbeddingProviderConfig {
    // Return config
  }
}
```

2. Export from `src/embeddings/providers/index.ts`:

```typescript
export { CustomEmbeddingProvider, createCustomProvider } from './custom';
```

3. Add tests and documentation

4. Update README with provider details

## Adding a New Example

To add a new example:

1. Create example file in `examples/`:

```typescript
// examples/my-use-case.ts
import { createVectorSearchClient, createOpenAIProvider } from '../src';

async function main() {
  // Example implementation
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };
```

2. Add npm script to `package.json`:

```json
{
  "scripts": {
    "example:my-use-case": "npx ts-node examples/my-use-case.ts"
  }
}
```

3. Document in `examples/README.md`

## Testing Guidelines

### Running Tests

```bash
npm run type-check    # Type checking
npm run build         # Build project
npm run example:*     # Run specific example
```

### Test Checklist

- [ ] Code type-checks without errors
- [ ] Build succeeds
- [ ] Examples run successfully
- [ ] No console errors or warnings
- [ ] Documentation updated

## SQL Migration Guidelines

When adding new migrations:

1. **Number sequentially** - `00X_description.sql`
2. **Use IF EXISTS** - Make migrations idempotent
3. **Add comments** - Explain purpose and usage
4. **Test rollback** - Ensure migrations can be reverted
5. **Performance** - Consider impact on large datasets

## Documentation Guidelines

- Update README for new features
- Add code examples for new APIs
- Document breaking changes clearly
- Include migration guides when needed
- Update ARCHITECTURE.md for design changes

## Performance Considerations

When contributing performance improvements:

1. **Benchmark** - Measure before and after
2. **Document tradeoffs** - Speed vs memory vs accuracy
3. **Test at scale** - Verify with realistic dataset sizes
4. **Consider limits** - API rate limits, memory constraints
5. **Profile** - Use EXPLAIN ANALYZE for SQL changes

## Security

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. Email security concerns to: [security email placeholder]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Open a discussion on GitHub
- Check existing documentation
- Review closed issues for similar questions

## Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!

---

**Maintained by:** Ravindra Kanchikare (krhebber)
**License:** MIT
