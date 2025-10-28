/**
 * Supabase Vector Search Client
 *
 * Main client for performing vector similarity search in Supabase.
 * Supports single-vector and multi-vector weighted search with flexible configuration.
 *
 * Author: Ravindra Kanchikare (krhebbar)
 * License: MIT
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Document,
  SearchResult,
  SearchOptions,
  WeightedSearchOptions,
  SupabaseConfig,
  InsertDocumentOptions,
  BatchInsertOptions,
  SearchError,
  ValidationError,
  EmbeddingProvider,
} from '../types';
import { generateDocumentEmbeddings, validateEmbeddingDimensions } from '../embeddings';

/**
 * Vector Search Client for Supabase
 *
 * Provides high-level API for vector search operations including:
 * - Document insertion with automatic embedding generation
 * - Single-vector similarity search
 * - Multi-vector weighted search
 * - Batch operations with progress tracking
 *
 * @example
 * ```typescript
 * const client = new VectorSearchClient({
 *   url: process.env.SUPABASE_URL,
 *   key: process.env.SUPABASE_KEY
 * });
 *
 * // Insert document with embeddings
 * await client.insertDocument({
 *   content: "Document text...",
 *   embedding: [...],
 *   metadata: { category: "article" }
 * });
 *
 * // Search for similar documents
 * const results = await client.search({
 *   queryEmbedding: [...],
 *   matchThreshold: 0.7,
 *   matchCount: 10
 * });
 * ```
 */
export class VectorSearchClient {
  private client: SupabaseClient;
  private tableName: string;
  private embeddingProvider?: EmbeddingProvider;

  constructor(config: SupabaseConfig, embeddingProvider?: EmbeddingProvider) {
    if (!config.url || !config.key) {
      throw new ValidationError('Supabase URL and key are required');
    }

    this.client = createClient(config.url, config.key);
    this.tableName = config.tableName || 'documents';
    this.embeddingProvider = embeddingProvider;
  }

  /**
   * Insert a single document into the database
   *
   * @param document - Document to insert
   * @returns Inserted document with ID
   */
  async insertDocument(document: Document): Promise<Document> {
    try {
      // Validate document
      if (!document.content || !document.content.trim()) {
        throw new ValidationError('Document content is required', 'content');
      }

      // Insert document
      const { data, error } = await this.client
        .from(this.tableName)
        .insert({
          content: document.content,
          metadata: document.metadata || {},
          embedding: document.embedding || null,
          embedding_section_1: document.embedding_section_1 || null,
          embedding_section_2: document.embedding_section_2 || null,
          embedding_section_3: document.embedding_section_3 || null,
        })
        .select()
        .single();

      if (error) {
        throw new SearchError(
          `Failed to insert document: ${error.message}`,
          error.code
        );
      }

      return data as Document;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SearchError) {
        throw error;
      }

      throw new SearchError(
        `Unexpected error inserting document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Insert multiple documents in batches
   *
   * @param documents - Array of documents to insert
   * @param batchSize - Number of documents per batch (default: 100)
   * @param onProgress - Progress callback
   * @returns Array of inserted documents
   */
  async insertDocumentsBatch(
    documents: Document[],
    batchSize: number = 100,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Document[]> {
    try {
      if (documents.length === 0) {
        return [];
      }

      const results: Document[] = [];
      let completed = 0;

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        const { data, error } = await this.client
          .from(this.tableName)
          .insert(
            batch.map((doc) => ({
              content: doc.content,
              metadata: doc.metadata || {},
              embedding: doc.embedding || null,
              embedding_section_1: doc.embedding_section_1 || null,
              embedding_section_2: doc.embedding_section_2 || null,
              embedding_section_3: doc.embedding_section_3 || null,
            }))
          )
          .select();

        if (error) {
          throw new SearchError(
            `Failed to insert batch: ${error.message}`,
            error.code
          );
        }

        results.push(...(data as Document[]));
        completed += batch.length;

        if (onProgress) {
          onProgress(completed, documents.length);
        }
      }

      return results;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }

      throw new SearchError(
        `Unexpected error in batch insert: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for documents using single-vector similarity
   *
   * Uses the match_documents SQL function from migration 004.
   *
   * @param options - Search options
   * @returns Array of matching documents with similarity scores
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    try {
      // Validate query embedding
      if (!options.queryEmbedding || options.queryEmbedding.length === 0) {
        throw new ValidationError('Query embedding is required', 'queryEmbedding');
      }

      // Call match_documents SQL function
      const { data, error } = await this.client
        .rpc('match_documents', {
          query_embedding: options.queryEmbedding,
          match_threshold: options.matchThreshold || 0.5,
          match_count: options.matchCount || 10,
          filter_metadata: options.filterMetadata || null,
        });

      if (error) {
        throw new SearchError(
          `Search failed: ${error.message}`,
          error.code
        );
      }

      return (data || []) as SearchResult[];
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SearchError) {
        throw error;
      }

      throw new SearchError(
        `Unexpected error during search: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for documents using multi-vector weighted similarity
   *
   * Uses the match_documents_weighted SQL function from migration 005.
   *
   * @param options - Weighted search options
   * @returns Array of matching documents with similarity scores
   */
  async searchWeighted(options: WeightedSearchOptions): Promise<SearchResult[]> {
    try {
      // Validate main query embedding
      if (!options.queryEmbedding || options.queryEmbedding.length === 0) {
        throw new ValidationError('Query embedding is required', 'queryEmbedding');
      }

      // Validate weights sum to reasonable value (warning only)
      const totalWeight =
        (options.weightMain || 0.25) +
        (options.weightSection1 || 0.25) +
        (options.weightSection2 || 0.25) +
        (options.weightSection3 || 0.25);

      if (Math.abs(totalWeight - 1.0) > 0.01) {
        console.warn(
          `Warning: Weights sum to ${totalWeight.toFixed(2)} instead of 1.0. ` +
          `This may affect score interpretation.`
        );
      }

      // Call match_documents_weighted SQL function
      const { data, error } = await this.client
        .rpc('match_documents_weighted', {
          query_embedding: options.queryEmbedding,
          query_section_1: options.querySection1 || null,
          query_section_2: options.querySection2 || null,
          query_section_3: options.querySection3 || null,
          weight_main: options.weightMain || 0.25,
          weight_section_1: options.weightSection1 || 0.25,
          weight_section_2: options.weightSection2 || 0.25,
          weight_section_3: options.weightSection3 || 0.25,
          match_threshold: options.matchThreshold || 0.5,
          match_count: options.matchCount || 10,
          filter_metadata: options.filterMetadata || null,
        });

      if (error) {
        throw new SearchError(
          `Weighted search failed: ${error.message}`,
          error.code
        );
      }

      return (data || []) as SearchResult[];
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SearchError) {
        throw error;
      }

      throw new SearchError(
        `Unexpected error during weighted search: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a document by ID
   *
   * @param id - Document ID
   * @returns Document or null if not found
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select()
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new SearchError(
          `Failed to get document: ${error.message}`,
          error.code
        );
      }

      return data as Document;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }

      throw new SearchError(
        `Unexpected error getting document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update a document
   *
   * @param id - Document ID
   * @param updates - Partial document with fields to update
   * @returns Updated document
   */
  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new SearchError(
          `Failed to update document: ${error.message}`,
          error.code
        );
      }

      return data as Document;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }

      throw new SearchError(
        `Unexpected error updating document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a document
   *
   * @param id - Document ID
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw new SearchError(
          `Failed to delete document: ${error.message}`,
          error.code
        );
      }
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }

      throw new SearchError(
        `Unexpected error deleting document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Count total documents
   *
   * @param filterMetadata - Optional metadata filter
   * @returns Document count
   */
  async countDocuments(filterMetadata?: Record<string, any>): Promise<number> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (filterMetadata) {
        query = query.contains('metadata', filterMetadata);
      }

      const { count, error } = await query;

      if (error) {
        throw new SearchError(
          `Failed to count documents: ${error.message}`,
          error.code
        );
      }

      return count || 0;
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }

      throw new SearchError(
        `Unexpected error counting documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the underlying Supabase client for advanced usage
   */
  getSupabaseClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Set or update the embedding provider
   */
  setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.embeddingProvider = provider;
  }

  /**
   * Get the current embedding provider
   */
  getEmbeddingProvider(): EmbeddingProvider | undefined {
    return this.embeddingProvider;
  }
}

/**
 * Convenience function to create a vector search client
 */
export function createVectorSearchClient(
  config: SupabaseConfig,
  embeddingProvider?: EmbeddingProvider
): VectorSearchClient {
  return new VectorSearchClient(config, embeddingProvider);
}
