/**
 * Supabase Vector Search Engine
 *
 * Production-ready vector similarity search for Supabase with PostgreSQL and pgvector.
 * Supports multi-vector weighted search for advanced semantic matching.
 *
 * Features:
 * - Single and multi-vector search
 * - Configurable weighted scoring
 * - Multiple embedding providers (OpenAI, Cohere)
 * - Batch operations with progress tracking
 * - Type-safe API
 *
 * Author: Ravindra Kanchikare (krhebber)
 * License: MIT
 *
 * @example
 * ```typescript
 * import {
 *   createVectorSearchClient,
 *   createOpenAIProvider,
 *   generateDocumentEmbeddings
 * } from 'supabase-vector-search';
 *
 * // Create embedding provider
 * const provider = createOpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY
 * });
 *
 * // Create search client
 * const client = createVectorSearchClient({
 *   url: process.env.SUPABASE_URL,
 *   key: process.env.SUPABASE_KEY
 * });
 *
 * // Generate embeddings and insert document
 * const embeddings = await generateDocumentEmbeddings({
 *   main: "Full document text...",
 *   section_1: "Title and summary",
 *   section_2: "Main content"
 * }, provider);
 *
 * await client.insertDocument({
 *   content: "Full document text...",
 *   ...embeddings,
 *   metadata: { category: "article" }
 * });
 *
 * // Search for similar documents
 * const queryEmbedding = await provider.generateEmbedding("search query");
 * const results = await client.search({
 *   queryEmbedding: queryEmbedding[0],
 *   matchThreshold: 0.7,
 *   matchCount: 10
 * });
 * ```
 */

// Types
export * from './types';

// Embedding providers and utilities
export * from './embeddings';

// Vector search client
export * from './search';

// Version
export const VERSION = '1.0.0';
