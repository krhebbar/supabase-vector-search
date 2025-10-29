/**
 * Search Manager
 *
 * Handles single-vector and multi-vector search operations.
 *
 * Author: Ravindra Kanchikare (krhebbar)
 * License: MIT
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SearchResult, SearchOptions, WeightedSearchOptions, SearchError, ValidationError } from '../types';
import { validateEmbeddingDimensions } from '../embeddings';
import { Logger, defaultLogger } from '../logger';

export class SearchManager {
  private client: SupabaseClient;
  private logger: Logger;

  constructor(client: SupabaseClient, logger: Logger = defaultLogger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Search for documents using single-vector similarity
   */
  async search(options: SearchOptions, expectedDimensions?: number): Promise<SearchResult[]> {
    try {
      if (!options.queryEmbedding || options.queryEmbedding.length === 0) {
        throw new ValidationError('Query embedding is required', 'queryEmbedding');
      }
      if (expectedDimensions) {
        validateEmbeddingDimensions(options.queryEmbedding, expectedDimensions);
      }

      const { data, error } = await this.client.rpc('match_documents', {
        query_embedding: options.queryEmbedding,
        match_threshold: options.matchThreshold || 0.5,
        match_count: options.matchCount || 10,
        filter_metadata: options.filterMetadata || null,
      });

      if (error) {
        throw new SearchError(`Search failed: ${error.message}`, error.code);
      }

      return (data || []) as SearchResult[];
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error during search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for documents using multi-vector weighted similarity
   */
  async searchWeighted(options: WeightedSearchOptions, expectedDimensions?: number): Promise<SearchResult[]> {
    try {
      if (!options.queryEmbedding || options.queryEmbedding.length === 0) {
        throw new ValidationError('Query embedding is required', 'queryEmbedding');
      }
      if (expectedDimensions) {
        validateEmbeddingDimensions(options.queryEmbedding, expectedDimensions);
        if (options.querySection1) validateEmbeddingDimensions(options.querySection1, expectedDimensions);
        if (options.querySection2) validateEmbeddingDimensions(options.querySection2, expectedDimensions);
        if (options.querySection3) validateEmbeddingDimensions(options.querySection3, expectedDimensions);
      }

      const totalWeight =
        (options.weightMain || 0.25) +
        (options.weightSection1 || 0.25) +
        (options.weightSection2 || 0.25) +
        (options.weightSection3 || 0.25);

      if (Math.abs(totalWeight - 1.0) > 0.01) {
        this.logger.warn(
          `Weights sum to ${totalWeight.toFixed(2)} instead of 1.0. This may affect score interpretation.`
        );
      }

      const { data, error } = await this.client.rpc('match_documents_weighted', {
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
        throw new SearchError(`Weighted search failed: ${error.message}`, error.code);
      }

      return (data || []) as SearchResult[];
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(`Unexpected error during weighted search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}