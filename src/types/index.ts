/**
 * Supabase Vector Search - Type Definitions
 *
 * Core types for vector search and embedding generation.
 *
 * Author: Ravindra Kanchikare (krhebber)
 * License: MIT
 */

/**
 * Vector embedding array (dimensions vary by model)
 */
export type Embedding = number[];

/**
 * Document with multiple section embeddings
 */
export interface DocumentEmbeddings {
  /** Main document embedding */
  embedding: Embedding | null;
  /** First section embedding (e.g., title, summary, metadata) */
  embedding_section_1?: Embedding | null;
  /** Second section embedding (e.g., main content, experience) */
  embedding_section_2?: Embedding | null;
  /** Third section embedding (e.g., skills, tags) */
  embedding_section_3?: Embedding | null;
}

/**
 * Document sections for multi-vector embedding
 */
export interface DocumentSections {
  /** Main document text (required) */
  main: string;
  /** First section text (optional) */
  section_1?: string;
  /** Second section text (optional) */
  section_2?: string;
  /** Third section text (optional) */
  section_3?: string;
}

/**
 * Document to store in Supabase
 */
export interface Document {
  /** Unique identifier (auto-generated if not provided) */
  id?: string;
  /** Full document text content */
  content: string;
  /** Flexible metadata (JSONB in database) */
  metadata?: Record<string, any>;
  /** Main document embedding */
  embedding?: Embedding;
  /** Section embeddings */
  embedding_section_1?: Embedding;
  embedding_section_2?: Embedding;
  embedding_section_3?: Embedding;
  /** Timestamps (auto-managed by database) */
  created_at?: string;
  updated_at?: string;
}

/**
 * Search result from vector search
 */
export interface SearchResult {
  /** Document ID */
  id: string;
  /** Document content */
  content: string;
  /** Document metadata */
  metadata?: Record<string, any>;
  /** Overall similarity score (0-1) */
  similarity: number;
  /** Individual section similarities (for weighted search) */
  similarity_main?: number;
  similarity_section_1?: number;
  similarity_section_2?: number;
  similarity_section_3?: number;
}

/**
 * Search options for match_documents function
 */
export interface SearchOptions {
  /** Query embedding vector */
  queryEmbedding: Embedding;
  /** Minimum similarity threshold (0-1, default: 0.5) */
  matchThreshold?: number;
  /** Maximum number of results (default: 10) */
  matchCount?: number;
  /** Optional metadata filter (must match exactly) */
  filterMetadata?: Record<string, any>;
}

/**
 * Weighted search options for match_documents_weighted function
 */
export interface WeightedSearchOptions {
  /** Main document query embedding */
  queryEmbedding: Embedding;
  /** Section 1 query embedding */
  querySection1?: Embedding;
  /** Section 2 query embedding */
  querySection2?: Embedding;
  /** Section 3 query embedding */
  querySection3?: Embedding;
  /** Weight for main embedding (default: 0.25) */
  weightMain?: number;
  /** Weight for section 1 (default: 0.25) */
  weightSection1?: number;
  /** Weight for section 2 (default: 0.25) */
  weightSection2?: number;
  /** Weight for section 3 (default: 0.25) */
  weightSection3?: number;
  /** Minimum similarity threshold (0-1, default: 0.5) */
  matchThreshold?: number;
  /** Maximum number of results (default: 10) */
  matchCount?: number;
  /** Optional metadata filter */
  filterMetadata?: Record<string, any>;
}

/**
 * Embedding provider configuration
 */
export interface EmbeddingProviderConfig {
  /** Provider name (openai, cohere, custom) */
  provider: 'openai' | 'cohere' | 'custom';
  /** API key for the provider */
  apiKey: string;
  /** Model name (e.g., text-embedding-ada-002) */
  model: string;
  /** Expected embedding dimensions */
  dimensions: number;
  /** Optional: Custom endpoint URL */
  endpoint?: string;
  /** Optional: Additional provider-specific options */
  options?: Record<string, any>;
}

/**
 * Embedding generation request
 */
export interface EmbeddingRequest {
  /** Text to embed (single string or array) */
  input: string | string[];
  /** Model to use (overrides config) */
  model?: string;
}

/**
 * Embedding generation response
 */
export interface EmbeddingResponse {
  /** Generated embeddings */
  embeddings: Embedding[];
  /** Model used */
  model: string;
  /** Token usage (if available) */
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Abstract embedding provider interface
 */
export interface EmbeddingProvider {
  /** Provider name */
  name: string;
  /** Embedding dimensions */
  dimensions: number;
  /** Generate embeddings for input text */
  generateEmbedding(input: string | string[]): Promise<Embedding[]>;
  /** Get provider configuration */
  getConfig(): EmbeddingProviderConfig;
}

/**
 * Batch embedding generation options
 */
export interface BatchEmbeddingOptions {
  /** Texts to embed */
  texts: string[];
  /** Batch size (default: 100) */
  batchSize?: number;
  /** Delay between batches in ms (default: 0) */
  delayMs?: number;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Document insertion options
 */
export interface InsertDocumentOptions {
  /** Document content and embeddings */
  document: Document;
  /** Whether to generate embeddings if missing (default: false) */
  generateEmbeddings?: boolean;
  /** Embedding provider to use (if generateEmbeddings is true) */
  embeddingProvider?: EmbeddingProvider;
}

/**
 * Batch document insertion options
 */
export interface BatchInsertOptions {
  /** Documents to insert */
  documents: Document[];
  /** Batch size (default: 100) */
  batchSize?: number;
  /** Whether to generate embeddings if missing (default: false) */
  generateEmbeddings?: boolean;
  /** Embedding provider to use (if generateEmbeddings is true) */
  embeddingProvider?: EmbeddingProvider;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Database configuration for Supabase
 */
export interface SupabaseConfig {
  /** Supabase project URL */
  url: string;
  /** Supabase anon/service role key */
  key: string;
  /** Optional: Table name (default: 'documents') */
  tableName?: string;
}

/**
 * Error types for better error handling
 */
export class EmbeddingError extends Error {
  constructor(message: string, public code?: string, public provider?: string) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

export class SearchError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SearchError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
