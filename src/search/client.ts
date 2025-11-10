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
  SupabaseConfig,
  EmbeddingProvider,
  Document,
  SearchOptions,
  WeightedSearchOptions,
  SearchResult,
} from '../types';
import { DocumentManager } from '../document/manager';
import { SearchManager } from './manager';
import { generateEmbedding } from '../embeddings';
import { Logger, defaultLogger } from '../logger';

export class VectorSearchClient {
  private client: SupabaseClient;
  private documentManager: DocumentManager;
  private searchManager: SearchManager;
  private embeddingProvider?: EmbeddingProvider;
  private expectedDimensions?: number;
  private logger: Logger;

  constructor(
    config: SupabaseConfig,
    embeddingProvider?: EmbeddingProvider,
    expectedDimensions?: number,
    logger: Logger = defaultLogger
  ) {
    this.client = createClient(config.url, config.key);
    this.embeddingProvider = embeddingProvider;
    this.documentManager = new DocumentManager(this.client, config.tableName, logger);
    this.searchManager = new SearchManager(this.client, logger);
    this.expectedDimensions = expectedDimensions;
    this.logger = logger;
  }

  /**
   * Insert a single document, generating embeddings if a provider is available.
   */
  async insertDocument(document: Document): Promise<Document> {
    if (this.embeddingProvider && !document.embedding) {
      document.embedding = await generateEmbedding(document.content, this.embeddingProvider);
    }
    return this.documentManager.insert(document);
  }

  /**
   * Insert multiple documents in batches, generating embeddings if a provider is available.
   */
  async insertDocumentsBatch(
    documents: Document[],
    batchSize: number = 100,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Document[]> {
    if (this.embeddingProvider) {
      // Generate embeddings in parallel for better performance
      const embeddingPromises = documents.map(async (doc) => {
        if (!doc.embedding) {
          doc.embedding = await generateEmbedding(doc.content, this.embeddingProvider!);
        }
      });
      await Promise.all(embeddingPromises);
    }
    return this.documentManager.insertBatch(documents, batchSize, onProgress);
  }
  
  /**
   * Search for documents using single-vector similarity
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    return this.searchManager.search(options, this.expectedDimensions);
  }

  /**
   * Search for documents using multi-vector weighted similarity
   */
  async searchWeighted(options: WeightedSearchOptions): Promise<SearchResult[]> {
    return this.searchManager.searchWeighted(options, this.expectedDimensions);
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    return this.documentManager.get(id);
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    return this.documentManager.update(id, updates);
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    return this.documentManager.delete(id);
  }

  /**
   * Count total documents
   */
  async countDocuments(filterMetadata?: Record<string, any>): Promise<number> {
    return this.documentManager.count(filterMetadata);
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
  embeddingProvider?: EmbeddingProvider,
  expectedDimensions?: number,
  logger: Logger = defaultLogger
): VectorSearchClient {
  return new VectorSearchClient(config, embeddingProvider, expectedDimensions, logger);
}