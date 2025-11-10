/**
 * Document Search Example
 *
 * Demonstrates single-vector semantic search for general documents.
 *
 * This example shows how to:
 * 1. Insert documents with embeddings
 * 2. Perform semantic search
 * 3. Use metadata filtering
 * 4. Batch insert documents
 *
 * Author: Ravindra Kanchikare (krhebbar)
 * License: MIT
 */

import {
  createVectorSearchClient,
  createOpenAIProvider,
  generateEmbedding,
  generateEmbeddingsBatch,
} from '../src';

/**
 * Sample documents
 */
const documents = [
  {
    content:
      'PostgreSQL is a powerful, open source object-relational database system with over 35 years of active development.',
    metadata: {
      category: 'database',
      tags: ['postgresql', 'database', 'sql'],
      author: 'Tech Writer',
    },
  },
  {
    content:
      'pgvector is a PostgreSQL extension for vector similarity search. It supports exact and approximate nearest neighbor search.',
    metadata: {
      category: 'database',
      tags: ['pgvector', 'vector-search', 'postgresql'],
      author: 'Database Expert',
    },
  },
  {
    content:
      'TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.',
    metadata: {
      category: 'programming',
      tags: ['typescript', 'javascript', 'programming'],
      author: 'Developer',
    },
  },
  {
    content:
      'Supabase is an open source Firebase alternative. It provides a Postgres database, authentication, instant APIs, and realtime subscriptions.',
    metadata: {
      category: 'backend',
      tags: ['supabase', 'backend', 'database', 'postgresql'],
      author: 'Backend Dev',
    },
  },
  {
    content:
      'Vector embeddings are numerical representations of text that capture semantic meaning. Similar texts have similar embeddings.',
    metadata: {
      category: 'machine-learning',
      tags: ['embeddings', 'vector-search', 'ml'],
      author: 'ML Engineer',
    },
  },
];

/**
 * Main example function
 */
async function main() {
  // Validate required environment variables
  const requiredEnvVars = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
  };

  for (const [name, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      console.error(`❌ Missing required environment variable: ${name}`);
      console.error(`   Please set ${name} in your .env file`);
      process.exit(1);
    }
  }

  // Initialize embedding provider
  const provider = createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-ada-002',
  });

  // Initialize vector search client
  const client = createVectorSearchClient({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_KEY!,
  });

  console.log('🚀 Document Search Example\n');

  // Step 1: Generate embeddings for all documents in batch
  console.log('🔄 Generating embeddings for documents...');
  const texts = documents.map((doc) => doc.content);
  const embeddings = await generateEmbeddingsBatch(
    {
      texts,
      batchSize: 5,
      onProgress: (completed, total) => {
        console.log(`   Progress: ${completed}/${total} documents embedded`);
      },
    },
    provider
  );
  console.log(`   ✓ Generated ${embeddings.length} embeddings\n`);

  // Step 2: Insert documents with embeddings
  console.log('💾 Inserting documents into Supabase...');
  const docsWithEmbeddings = documents.map((doc, index) => ({
    content: doc.content,
    embedding: embeddings[index],
    metadata: doc.metadata,
  }));

  const insertedDocs = await client.insertDocumentsBatch(
    docsWithEmbeddings,
    10,
    (completed, total) => {
      console.log(`   Progress: ${completed}/${total} documents inserted`);
    }
  );
  console.log(`   ✓ Inserted ${insertedDocs.length} documents\n`);

  // Step 3: Count documents
  const totalDocs = await client.countDocuments();
  console.log(`📊 Total documents in database: ${totalDocs}\n`);

  // Step 4: Perform semantic search
  console.log('🔍 Search Example 1: Finding documents about vector search\n');
  const query1 = 'How do I implement semantic similarity search with vectors?';
  console.log(`   Query: "${query1}"`);

  const queryEmbedding1 = await generateEmbedding(query1, provider);
  const results1 = await client.search({
    queryEmbedding: queryEmbedding1,
    matchThreshold: 0.5,
    matchCount: 3,
  });

  console.log(`   \n   Found ${results1.length} relevant documents:\n`);
  results1.forEach((result, index) => {
    console.log(`   ${index + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    console.log(`      "${result.content.substring(0, 80)}..."`);
    console.log(`      Category: ${result.metadata?.category || 'N/A'}\n`);
  });

  // Step 5: Search with metadata filtering
  console.log('🔍 Search Example 2: Finding database-related documents\n');
  const query2 = 'Tell me about PostgreSQL features';
  console.log(`   Query: "${query2}"`);
  console.log('   Filter: category = "database"\n');

  const queryEmbedding2 = await generateEmbedding(query2, provider);
  const results2 = await client.search({
    queryEmbedding: queryEmbedding2,
    matchThreshold: 0.5,
    matchCount: 5,
    filterMetadata: { category: 'database' },
  });

  console.log(`   Found ${results2.length} relevant documents:\n`);
  results2.forEach((result, index) => {
    console.log(`   ${index + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    console.log(`      "${result.content.substring(0, 80)}..."`);
    console.log(`      Tags: ${result.metadata?.tags?.join(', ') || 'N/A'}\n`);
  });

  // Step 6: Search across all categories
  console.log('🔍 Search Example 3: Cross-category search\n');
  const query3 = 'What tools should I use to build a web application?';
  console.log(`   Query: "${query3}"\n`);

  const queryEmbedding3 = await generateEmbedding(query3, provider);
  const results3 = await client.search({
    queryEmbedding: queryEmbedding3,
    matchThreshold: 0.4, // Lower threshold for broader results
    matchCount: 5,
  });

  console.log(`   Found ${results3.length} relevant documents:\n`);
  results3.forEach((result, index) => {
    console.log(`   ${index + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    console.log(`      Category: ${result.metadata?.category || 'N/A'}`);
    console.log(`      "${result.content.substring(0, 80)}..."\n`);
  });

  // Step 7: Get specific document by ID
  console.log('📄 Retrieving specific document by ID...\n');
  const firstDocId = insertedDocs[0].id!;
  const doc = await client.getDocument(firstDocId);
  if (doc) {
    console.log(`   Retrieved: "${doc.content.substring(0, 60)}..."`);
    console.log(`   Metadata: ${JSON.stringify(doc.metadata)}\n`);
  }

  // Step 8: Update document metadata
  console.log('✏️  Updating document metadata...\n');
  await client.updateDocument(firstDocId, {
    metadata: {
      ...doc?.metadata,
      updated: true,
      last_modified: new Date().toISOString(),
    },
  });
  console.log('   ✓ Document updated\n');

  // Step 9: Clean up - delete test documents
  console.log('🧹 Cleaning up test data...');
  for (const doc of insertedDocs) {
    await client.deleteDocument(doc.id!);
  }
  console.log(`   ✓ Deleted ${insertedDocs.length} test documents\n`);

  // Verify cleanup
  const remainingDocs = await client.countDocuments();
  console.log(`📊 Remaining documents: ${remainingDocs}\n`);

  console.log('✅ Example complete!');
}

// Run the example
if (require.main === module) {
  main().catch((error) => {
    console.error('Error running example:', error);
    process.exit(1);
  });
}

export { main };
